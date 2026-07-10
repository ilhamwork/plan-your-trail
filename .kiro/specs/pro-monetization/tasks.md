# Implementation Plan: Pro Monetization

## Overview

Implement a three-tier subscription model (Anonymous → Free → Pro) on top of the existing Next.js 16 + Supabase stack. The work is organized into eight groups: database schema, server-side infrastructure (access guard, rate limiter, subscription logic), authentication pages, route storage, payment & webhooks, pro-gated API endpoints, UI upgrades, and the pricing/account pages.

## Tasks

- [x] 1. Database schema and Supabase configuration
  - [x] 1.1 Create Supabase migration: profiles, subscriptions, saved_routes, share_links, rate_limit_windows, route_notes, dunning_log, deleted_account_flags tables
    - Write SQL migration file with all CREATE TABLE, CREATE INDEX, RLS policies, and the `handle_new_user` trigger exactly as specified in the design
    - Include `subscription_status` and `subscription_plan` enums, and `route_access` enum
    - _Requirements: 1.1, 2.1, 5.1, 6.1, 8.1, 9.1, 11.1, 12.1_
  - [x] 1.2 Create Supabase Edge Function for nightly soft-delete cleanup and rate-limit-window pruning
    - Implement the pg_cron-scheduled function that permanently deletes `saved_routes` rows where `deleted_at < now() - INTERVAL '30 days'`
    - Implement the nightly `DELETE FROM rate_limit_windows WHERE window_start < now() - INTERVAL '25 hours'` cleanup
    - _Requirements: 5.7, 6.4_


- [x] 2. Core server-side library modules
  - [x] 2.1 Implement `lib/supabase-server.ts` — SSR client factory
    - Export `createSupabaseServerClient(cookieStore)` using `@supabase/ssr` with cookie read/write
    - Export `createSupabaseAdminClient()` using the service-role key (server-side only)
    - Install `@supabase/ssr` package
    - _Requirements: 2.1, 2.7_
  - [x] 2.2 Implement `lib/access-guard.ts` — tier resolution and feature gate
    - Implement `resolveTier()` with the full resolution chain: unauthenticated → anonymous, no sub → free, active/grace(valid) → pro, grace(expired) → lazy-expire + free, cancelled(within period) → pro, cancelled(past period) → free
    - Implement `requireTier(ctx, minimum)` that throws a 403 Response on failure
    - Implement `requireFeature(ctx, feature)` for named feature constants
    - Return 503 on database error (Req 2.8)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_
  - [ ]* 2.3 Write property test for tier resolution (Property 1)
    - **Property 1: Tier Resolution is Total and Deterministic**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.9**
    - File: `lib/__tests__/access-guard.property.test.ts`
    - Use `fc.record({ isAuthenticated: fc.boolean(), subscriptionStatus: fc.option(...), gracePeriodEndsAt: fc.option(fc.date()) })`
    - Assert result is always in `['anonymous', 'free', 'pro']` and never throws
  - [x] 2.4 Implement `lib/rate-limiter.ts` — rolling 24-hour window
    - Implement `checkRateLimit(identifier, identifierType, tier)` querying `rate_limit_windows` with `window_start > now() - INTERVAL '24 hours'`
    - Implement `recordUpload(identifier, identifierType)` that inserts a new row
    - Pro tier returns `{ allowed: true, limit: Infinity }` without a DB query
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7_
  - [ ]* 2.5 Write property test for rolling window count (Property 6)
    - **Property 6: Rate Limit Rolling Window Only Counts Uploads in the Last 24 Hours**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
    - File: `lib/__tests__/rate-limiter.property.test.ts`
    - Arbitraries: `fc.array(fc.date(), { minLength: 0, maxLength: 100 })` as upload timestamps
    - Assert count equals `timestamps.filter(t => t > now - 24h).length`
  - [ ]* 2.6 Write property test for blocked uploads not incrementing count (Property 7)
    - **Property 7: Blocked Uploads Do Not Increment the Rate Limit Count**
    - **Validates: Requirements 6.6, 6.7**
    - File: `lib/__tests__/rate-limiter.property.test.ts`
    - Assert count before === count after a blocked upload call


- [x] 3. Subscription and share-token library modules
  - [x] 3.1 Implement `lib/subscription.ts` — subscription lifecycle helpers
    - Implement `getActiveSubscription(userId)`, `beginGracePeriod(subscriptionId)`, `expireGracePeriod(subscriptionId)`, `cancelSubscription(subscriptionId)`, `downgradeUserToFree(userId)`
    - `downgradeUserToFree` marks routes beyond the top-3 by `created_at DESC` as `read_only` without deleting them
    - _Requirements: 8.8, 8.9, 8.10, 8.14, 10.1, 10.3_
  - [x] 3.2 Implement `applyIntroductoryPrice(userId)` with atomic CTE check-and-set
    - Use the SQL CTE pattern from the design: `UPDATE profiles SET intro_price_used=TRUE WHERE intro_price_used=FALSE RETURNING id` inside a transaction with the subscription INSERT
    - _Requirements: 8.4, 8.6, 12.1, 12.2, 12.3, 12.7_
  - [ ]* 3.3 Write property test for introductory price atomicity (Property 8)
    - **Property 8: Introductory Price Flag is Monotone and Atomically Applied**
    - **Validates: Requirements 8.4, 8.5, 8.6, 12.2, 12.3, 12.7**
    - File: `lib/__tests__/subscription.property.test.ts`
    - Arbitraries: `fc.integer({ min: 2, max: 10 })` concurrent callers for the same userId
    - Assert exactly 1 call succeeds with intro price; final `intro_price_used` is `true` exactly once
  - [x] 3.4 Implement `lib/share-token.ts` — cryptographically random token generation
    - Use `crypto.randomBytes(32).toString('hex')` (256 bits, 64 hex chars)
    - _Requirements: 11.2_
  - [ ]* 3.5 Write property test for share link token entropy (Property 12)
    - **Property 12: Share Link Tokens Meet Minimum Entropy**
    - **Validates: Requirements 11.2**
    - File: `lib/__tests__/share-token.property.test.ts`
    - Arbitraries: `fc.integer({ min: 1, max: 500 })` token generation calls
    - Assert each token ≥ 64 hex chars and `new Set(tokens).size === tokens.length`

- [x] 4. Next.js middleware and environment setup
  - [x] 4.1 Implement `middleware.ts` — session refresh and protected route redirection
    - Use `@supabase/ssr` `createServerClient` with cookie passthrough
    - Refresh session on every request via `supabase.auth.getUser()`
    - Redirect unauthenticated users away from `/account` and `/routes` to `/auth/login?redirectAfter=<path>`
    - Redirect authenticated users away from `/auth/login` and `/auth/register` to `/`
    - Configure matcher to exclude `_next/static`, `_next/image`, `favicon.ico`, and `public/`
    - _Requirements: 1.8, 1.11, 1.15_
  - [x] 4.2 Add required environment variables to `.env.example`
    - Document `SUPABASE_SERVICE_ROLE_KEY`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`
    - _Requirements: 8.1_


- [x] 5. Authentication API routes and context
  - [x] 5.1 Implement `POST /api/auth/register` route handler
    - Validate password: 8–128 chars, ≥1 uppercase, ≥1 lowercase, ≥1 number; return descriptive 400 on violation
    - Call `supabase.auth.signUp()`, handle duplicate email with descriptive error (Req 1.4)
    - Check `deleted_account_flags` by SHA-256 hash of lowercase email and inherit `intro_price_used` if found (Req 12.6)
    - Send verification email (Req 1.3); allow immediate Free access without verification (Req 1.5)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 12.6_
  - [x] 5.2 Implement `POST /api/auth/logout` and `/api/auth/me` route handlers
    - `logout`: call `supabase.auth.signOut()`, clear session cookies, return 200 (Req 1.12)
    - `me`: return `{ user, tier, gracePeriodEndsAt, introUsed }` using `resolveTier()`; used by `AuthContext` on mount
    - _Requirements: 1.12, 2.1_
  - [x] 5.3 Create `contexts/AuthContext.tsx` — app-wide auth and tier state
    - Provide `{ user, tier, gracePeriodEndsAt, introUsed, isLoading, signOut, refreshTier }`
    - Hydrate from `/api/auth/me` on mount
    - Subscribe to `supabase.auth.onAuthStateChange` for session changes
    - On `SIGNED_IN` event with `pendingGpxData` in React ref, call `POST /api/routes` and clear the ref; show error with retry on failure (Req 7.3, 7.4, 5.9)
    - _Requirements: 1.11, 5.9, 7.3, 7.4_
  - [x] 5.4 Create auth pages: `/auth/login`, `/auth/register`, `/auth/verify-email`, `/auth/reset-password`
    - Login: email/password form + Google OAuth button (`supabase.auth.signInWithOAuth({ provider: 'google' })`); lockout message after 5 failed attempts (Req 1.13); session lasts 7 days (Req 1.8)
    - Register: form with inline password strength indicators (uppercase/lowercase/number status); duplicate email error; Google OAuth path (Req 1.2)
    - Verify-email: post-registration prompt page, no gating on Free features
    - Reset-password: block if email not verified (Req 1.7)
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 1.8, 1.9, 1.10, 1.13, 1.14_
  - [ ]* 5.5 Write property test for registration producing a Free account (Property 2)
    - **Property 2: Registration Produces an Immediately Usable Free Account**
    - **Validates: Requirements 1.1, 1.5**
    - File: `lib/__tests__/auth.property.test.ts`
    - Arbitraries: `fc.record({ email: fc.emailAddress(), password: validPasswordArb })`
    - Assert `resolveTier()` returns `'free'` immediately after successful registration


- [x] 6. Route storage API
  - [x] 6.1 Implement `GET /api/routes`, `POST /api/routes`, `GET /api/routes/[id]`, `PATCH /api/routes/[id]`, `DELETE /api/routes/[id]`
    - `POST`: call `resolveTier()`, enforce Free 3-route limit (return 403 `ROUTE_LIMIT_REACHED` if count ≥ 3), enforce file size limit (10 MB Free, 25 MB Pro), insert into `saved_routes`
    - `PATCH`: block writes if `access_level = 'read_only'` (for downgraded routes)
    - `DELETE`: soft-delete by setting `deleted_at = now()`, deactivate all `share_links` for the route
    - _Requirements: 3.10, 5.1, 5.2, 5.5, 5.6, 13.1, 13.2, 13.3_
  - [ ]* 6.2 Write property test for Free-tier route save limit (Property 5)
    - **Property 5: Free-Tier Route Save Limit Enforced at API Level**
    - **Validates: Requirements 3.10, 5.1**
    - File: `app/api/routes/__tests__/save-limit.property.test.ts`
    - Assert that `POST /api/routes` with a user already having 3 routes returns an error and DB route count remains 3
  - [x] 6.3 Implement soft-delete restore on Pro upgrade and read-only marking on downgrade
    - Add `restoreSoftDeletedRoutes(userId)` to `lib/subscription.ts`: set `deleted_at = NULL` for routes where `deleted_at > now() - INTERVAL '30 days'`
    - Wire `restoreSoftDeletedRoutes` call into the webhook `settlement` handler when a new Pro subscription is activated
    - Wire `downgradeUserToFree(userId)` into `expireGracePeriod` and `cancelSubscription` period-end flows
    - _Requirements: 5.8, 5.10, 5.11, 10.1, 10.5_
  - [ ]* 6.4 Write property test for soft-delete 30-day retention (Property 9)
    - **Property 9: Soft-Delete Preserves Route Data for the 30-Day Retention Window**
    - **Validates: Requirements 5.6, 5.7**
    - File: `lib/__tests__/route-store.property.test.ts`
    - Assert within-30-day soft-deleted routes are in restoration list; beyond-30-day are not
  - [ ]* 6.5 Write property test for upgrade restore (Property 10)
    - **Property 10: Upgrade Restores Soft-Deleted Routes Within the 30-Day Window**
    - **Validates: Requirements 5.8, 10.5**
    - File: `lib/__tests__/route-store.property.test.ts`
    - Assert `restoreSoftDeletedRoutes()` sets `deleted_at = NULL` on all within-window soft-deleted routes
  - [ ]* 6.6 Write property test for downgrade preserving and marking read-only (Property 11)
    - **Property 11: Pro-to-Free Downgrade Marks Excess Routes Read-Only Without Deleting Them**
    - **Validates: Requirements 5.10, 5.11, 10.1**
    - File: `lib/__tests__/route-store.property.test.ts`
    - Arbitraries: `fc.integer({ min: 4, max: 20 })` routes per user
    - Assert all N routes still exist, bottom N-3 have `access_level = 'read_only'`, top 3 have `read_write`

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [x] 8. Payment and webhook integration
  - [x] 8.1 Implement `POST /api/subscription/checkout` — Midtrans Snap token creation
    - Call `resolveTier()`, assert tier is `free` and `email_verified = true` (return 403 `EMAIL_NOT_VERIFIED` otherwise)
    - Read `profiles.intro_price_used`; set `gross_amount = 29000` if unused, else `49000`/`399000` based on plan
    - POST to Midtrans `/snap/v1/transactions` with server key; return `{ snapToken, amount }` to client
    - On Midtrans network error, return 503 `PAYMENT_GATEWAY_ERROR` without mutating subscription state
    - _Requirements: 1.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.12_
  - [ ]* 8.2 Write property test for unverified user blocked from checkout (Property 3)
    - **Property 3: Unverified Email Blocks Pro Upgrade**
    - **Validates: Requirements 1.6**
    - File: `app/api/subscription/__tests__/checkout.property.test.ts`
    - Assert `POST /api/subscription/checkout` with `email_verified=false` always returns 403 without a subscription record being created
  - [x] 8.3 Implement `POST /api/webhook/midtrans` — Midtrans webhook handler
    - Verify HMAC-SHA512 signature (`SHA512(order_id + status_code + gross_amount + SERVER_KEY)`); return 400 on invalid
    - Handle `capture`/`settlement`: call `activateSubscription()` with atomic intro price CTE; call `restoreSoftDeletedRoutes()` for new Pro users
    - Handle `deny`/`expire`: call `beginGracePeriod()` and schedule two dunning emails
    - Handle `cancel`: call `cancelSubscription()`
    - Idempotent on duplicate delivery via `midtrans_order_id` upsert key
    - _Requirements: 8.7, 8.8, 8.11, 12.2, 12.7_
  - [x] 8.4 Implement `POST /api/subscription/cancel` and `GET /api/subscription/portal`
    - `cancel`: set `status='cancelled'`, `cancelled_at=now()`; Pro access continues until `current_period_end` (Req 8.14); return 200
    - `portal`: return current subscription status, `current_period_end`, and billing history for the account page
    - _Requirements: 8.14, 10.2_
  - [x] 8.5 Implement dunning email scheduling in `lib/subscription.ts`
    - `scheduleDunningEmails(subscriptionId, gracePeriodEnd)`: queue first email immediately (grace start) and second email at `gracePeriodEnd - 24h`
    - Write to `dunning_log` with `delivery_status`; on delivery failure, record `'failed'` (in-app banner is the fallback, Req 9.5)
    - Each email includes days remaining in grace period
    - _Requirements: 9.1, 9.5_


- [x] 9. Pro-gated API endpoints
  - [x] 9.1 Implement `POST /api/upload` with rate limiting and file size gating
    - Call `resolveTier()` to determine tier and identifier (IP for anonymous, user ID for authenticated)
    - Call `checkRateLimit()` before processing; return 429 `RATE_LIMIT_EXCEEDED` with `retryAfter` if blocked (blocked upload not recorded)
    - Enforce file size: reject >10 MB for Anonymous/Free, >25 MB for Pro with 413 `FILE_TOO_LARGE` including tier name and limit
    - Call `recordUpload()` only on allowed requests
    - Return nudge prompt data in response when anonymous count is 3 or 4 (non-blocking, Req 6.5)
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8, 13.1, 13.2, 13.3_
  - [x] 9.2 Implement `POST/PUT/DELETE /api/waypoints` — Pro-gated
    - Call `resolveTier()` then `requireTier(ctx, 'pro')`; return 403 on failure without executing the operation
    - _Requirements: 3.1, 3.11_
  - [x] 9.3 Implement `GET /api/weather` and `GET /api/weather/hourly` — Pro-gated
    - Both endpoints independently gated: call `requireTier(ctx, 'pro')` on each
    - _Requirements: 3.3, 3.4, 3.11_
  - [x] 9.4 Implement `POST /api/pace`, `POST /api/export/pdf`, `POST /api/compare`, `GET/POST /api/notes/[routeId]` — Pro-gated
    - Each calls `requireTier(ctx, 'pro')` as first action; return 403 without any side effects
    - _Requirements: 3.5, 3.6, 3.8, 3.9, 3.11_
  - [ ]* 9.5 Write property test for Pro-gated endpoints (Property 4)
    - **Property 4: Pro-Gated Endpoints Deny Non-Pro Tiers Without Side Effects**
    - **Validates: Requirements 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.11**
    - File: `app/api/__tests__/pro-gate.property.test.ts`
    - Arbitraries: `fc.constantFrom(...PRO_GATED_ROUTES)` × `fc.constantFrom('anonymous', 'free')`
    - Assert response status is 403 and no DB write occurred (spy on supabase client)
  - [x] 9.5 Implement `POST /api/share`, `GET /api/share/[token]`, `DELETE /api/share/[token]`
    - `POST`: requireTier('pro'), verify route ownership, enforce 5-link-per-route limit (403 `SHARE_LIMIT_REACHED`), generate token, insert into `share_links`
    - `GET`: no auth required; SELECT by token where `is_active=TRUE`; verify route `deleted_at IS NULL`; return 404 for missing/revoked/soft-deleted
    - `DELETE`: requireTier('free'), verify ownership, set `is_active=FALSE`, `revoked_at=now()`
    - Enforce data-layer Pro restriction independently of UI gate (Req 11.1)
    - _Requirements: 3.7, 3.11, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  - [ ]* 9.6 Write property test for revoked share links returning 404 (Property 13)
    - **Property 13: Revoked Share Links Return 404 on All Subsequent Access**
    - **Validates: Requirements 11.5, 11.6, 10.4**
    - File: `app/api/share/__tests__/revocation.property.test.ts`
    - Assert every `GET /api/share/[token]` after a successful DELETE returns 404

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [x] 11. Pro gate and upgrade prompt UI components
  - [x] 11.1 Create `components/pro/ProGate.tsx` and `hooks/useUpgradePromptDismissal.ts`
    - `ProGate`: renders `children` for Pro tier, `fallback` for others; transparent wrapper with no DOM overhead for Pro users
    - `useUpgradePromptDismissal(feature)`: reads/writes `sessionStorage` key `upgrade_dismissed_${feature}`; returns `{ dismissed, dismiss }`
    - _Requirements: 4.5, 4.6_
  - [x] 11.2 Create `components/pro/UpgradePrompt.tsx` — four variants
    - `tooltip`: Radix UI Tooltip wrapping a `disabled` button (waypoints)
    - `overlay`: `backdrop-blur-sm` div over content with centered CTA card (weather)
    - `inline`: banner above table with `—` cells (pace estimator)
    - `sheet`: framer-motion slide-up bottom sheet offering "Upgrade" or "Delete a route" (save limit); non-blocking, page scrollable behind it
    - Use `useUpgradePromptDismissal` to suppress already-dismissed prompts in the same session
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.3_
  - [x] 11.3 Create `components/pro/GracePeriodBanner.tsx`
    - Sticky banner visible while subscription is in `grace_period`; shows days remaining; dismissible
    - On dismiss: stores flag in sessionStorage; re-appears on next login (reads grace state from `AuthContext`)
    - _Requirements: 9.2, 9.3, 9.4, 9.5_
  - [x] 11.4 Create `components/pro/PricingCard.tsx`
    - Accepts `tier`, `features[]`, `price`, `introPrice?`, `isRecommended`, `ctaLabel`
    - Renders "Intro price" badge adjacent to `introPrice` when prop is provided
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  - [x] 11.5 Update `components/trail/WaypointPanel.tsx` to accept `tier: UserTier`
    - When `tier !== 'pro'`: all add/edit/delete buttons are `disabled`, each wrapped with `UpgradePrompt` tooltip variant
    - _Requirements: 3.1, 4.1_
  - [x] 11.6 Update `components/trail/WeatherForecast.tsx` to accept `tier: UserTier`
    - When `tier !== 'pro'`: render blurred content overlay + `UpgradePrompt` overlay variant; do not fetch weather data from client
    - _Requirements: 3.3, 4.2_
  - [x] 11.7 Update `components/trail/ElevationChart.tsx` to accept `showWaypointLabels: boolean`
    - When `showWaypointLabels=false` (non-Pro), omit waypoint label annotations from the elevation profile
    - _Requirements: 3.2_
  - [x] 11.8 Update `components/trail/Header.tsx` to show user avatar, tier badge, and nav links
    - Authenticated: avatar (initials fallback), ProBadge chip if tier='pro', "My Routes" link, dropdown with "Account", "Pricing", "Sign out"
    - Unauthenticated: "Log in" and "Sign up" buttons
    - _Requirements: 1.12_


- [x] 12. Route list and save UI components
  - [x] 12.1 Create `components/routes/RouteList.tsx` — paginated saved route list
    - Show read-only badge on routes with `access_level = 'read_only'`
    - Each route row has view, delete (soft-delete), and share (Pro-only via ProGate) actions
    - _Requirements: 5.10, 5.11, 10.1_
  - [x] 12.2 Create `components/routes/SaveRouteButton.tsx` — enforces save limit before persisting
    - For Free users at 3-route limit: show `UpgradePrompt` sheet variant before saving
    - Sheet offers "Upgrade to Pro" or "Delete a route to free space"
    - On "Delete a route": open route picker, soft-delete selected route, then auto-save new route without a second click (Req 5.5)
    - _Requirements: 5.3, 5.4, 5.5_
  - [x] 12.3 Wire `ProGate` and `UpgradePrompt` into `app/page.tsx` for all gated sections
    - Pace estimator: render `—` cells + `UpgradePrompt` inline variant for non-Pro
    - Waypoints: pass `tier` to `WaypointPanel`
    - Weather: pass `tier` to `WeatherForecast`
    - Share link button: `UpgradePrompt` sheet variant for non-Pro (Req 3.12)
    - Only show Upgrade_Prompts after analysis results are loaded (Req 4.4)
    - _Requirements: 3.12, 4.1, 4.2, 4.3, 4.4_

- [x] 13. Pricing and account pages
  - [x] 13.1 Create `app/pricing/page.tsx` — tier comparison and checkout CTA
    - Server component; fetch `intro_price_used` from session (fallback: show intro offer on auth/data error)
    - Render three `PricingCard` components; Pro card has "Most Popular" badge
    - Show monthly (Rp 49k), annual (Rp 399k / Rp 33.250/month equivalent), and intro (Rp 29k) prices
    - Show intro badge when: unauthenticated, or authenticated with `intro_price_used=false`
    - Hide intro badge when `intro_price_used=true`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_
  - [x] 13.2 Create `app/account/page.tsx` — subscription management and saved routes
    - Protected server component; redirect unauthenticated to `/auth/login`
    - Show current subscription status, next billing date, billing history via `/api/subscription/portal`
    - "Cancel subscription" CTA with confirmation dialog before calling `/api/subscription/cancel`
    - Render `RouteList` component
    - Show `GracePeriodBanner` when tier is in grace period
    - _Requirements: 8.14, 9.2, 10.2_
  - [x] 13.3 Create `app/routes/page.tsx` — full saved route list page for authenticated users
    - Protected server component; fetch routes from `/api/routes`; render `RouteList`
    - _Requirements: 5.1, 5.2_

- [x] 14. Anonymous-to-Free conversion and registration nudge
  - [x] 14.1 Implement anonymous conversion nudge in `app/page.tsx`
    - After GPX analysis results are fully rendered, display a non-blocking, dismissible prompt to register and save
    - Only show if user is anonymous AND analysis is complete (Req 7.2)
    - Store dismissal in sessionStorage; do not re-show within same session (Req 7.1)
    - _Requirements: 7.1, 7.2_
  - [x] 14.2 Wire post-sign-up auto-save in `contexts/AuthContext.tsx`
    - On `SIGNED_IN` event: if `pendingGpxData` React ref is set, call `POST /api/routes` with that data
    - On success: clear ref; on failure: show error with manual retry option
    - _Requirements: 7.3, 7.4_

- [x] 15. Checkout client integration
  - [x] 15.1 Add Midtrans Snap client script and checkout flow in `app/pricing/page.tsx` or a dedicated `components/pro/CheckoutButton.tsx`
    - Load `snap.js` via `MIDTRANS_CLIENT_KEY`
    - On CTA click: call `POST /api/subscription/checkout`, receive `snapToken`, invoke `window.snap.pay(snapToken, { onSuccess, onError, onPending })`
    - On success: redirect to `/account?upgraded=1`; on error: show error message without mutating state
    - _Requirements: 8.7, 8.12_

- [x] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they cover property-based tests using fast-check (`npm install --save-dev fast-check`)
- Each property test task references a numbered property from the design's Correctness Properties section; run with a minimum of 200 iterations per the design spec
- Checkpoints at tasks 7, 10, and 16 ensure incremental validation between major groups
- All server-side API route handlers must call `resolveTier()` as their first action — never trust client-supplied tier values
- The Midtrans webhook handler is the authoritative source for subscription state transitions; never mutate subscription state from the checkout client path
- Introductory price logic must use the atomic CTE pattern to prevent race conditions on concurrent subscription attempts
- `@supabase/ssr` must be installed (`npm install @supabase/ssr`) before implementing any server-side Supabase client work

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "4.2"] },
    { "id": 1, "tasks": ["2.1", "2.4"] },
    { "id": 2, "tasks": ["2.2", "3.4", "4.1"] },
    { "id": 3, "tasks": ["2.3", "2.5", "2.6", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "5.1", "5.2", "6.1", "9.1"] },
    { "id": 5, "tasks": ["3.5", "5.3", "6.2", "6.3", "8.1", "9.2", "9.3", "9.4", "9.5"] },
    { "id": 6, "tasks": ["5.4", "5.5", "6.4", "6.5", "6.6", "8.2", "8.3", "9.6"] },
    { "id": 7, "tasks": ["8.4", "8.5", "11.1"] },
    { "id": 8, "tasks": ["11.2", "11.3", "11.4", "11.5", "11.6", "11.7", "11.8", "12.1"] },
    { "id": 9, "tasks": ["12.2", "12.3", "13.1", "13.2", "13.3", "14.1"] },
    { "id": 10, "tasks": ["14.2", "15.1"] }
  ]
}
```
