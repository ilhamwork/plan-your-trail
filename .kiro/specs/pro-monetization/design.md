# Design Document — Pro Monetization

## Overview

This document describes the full technical design for adding a three-tier subscription model (Anonymous → Free → Pro) to PlanYourTrail.run. The feature introduces user authentication, a Midtrans-powered billing system, server-side feature gating, route persistence, rate limiting, and a set of Pro-exclusive analysis tools on top of the existing Next.js 16 + Supabase stack.

### Key Design Decisions

**Decision 1 — Server-side gating only.** Every protected API route re-reads subscription state from the database on each request. Client-side tier state is used only for rendering upgrade prompts; it never governs access. This closes any bypass path where a user manipulates local state.

**Decision 2 — Supabase SSR client alongside the existing browser client.** The existing `lib/supabase.ts` is kept as-is for client components. A new server-side client using `@supabase/ssr` reads cookies in Server Components and Route Handlers. Both clients share the same project URL and anon key; the service-role key is restricted to server-side webhook processing only.

**Decision 3 — Midtrans Snap for checkout.** Midtrans Snap provides a hosted payment page that embeds as an overlay in our app. We send a server-side charge request, receive a `snap_token`, pass it to the client, and Midtrans handles all PCI-sensitive data. Subscription lifecycle state (Active / GracePeriod / Cancelled / Free) is maintained entirely within our own Supabase `subscriptions` table, updated by webhook events from Midtrans.

**Decision 4 — Inline upgrade prompts, no blocking modals.** Pro feature UI components accept a `userTier` prop and render gated states (blurred content, disabled controls, dashed placeholders) without mounting separate modal flows. Dismissal state lives in `sessionStorage` keyed by feature slug.

**Decision 5 — Soft-delete with 30-day retention.** Route deletion is never immediate. A `deleted_at` timestamp flags soft-deleted rows; a scheduled Supabase Edge Function runs nightly to permanently delete rows past 30 days. This window also enables the upgrade-restore flow.

---

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Client Components)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Context │  │ Tier Context │  │ Route Context│  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         └─────────────────┼──────────────────┘          │
│                   React 19 App                          │
└──────────────────────┬──────────────────────────────────┘
                       │  fetch / Server Actions
┌──────────────────────▼──────────────────────────────────┐
│  Next.js Middleware  (middleware.ts)                     │
│  • Session cookie refresh                               │
│  • Tier resolution for protected pages                  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Next.js Route Handlers  (app/api/**)                   │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │ /api/auth  │  │/api/subscription│  │ /api/routes  │  │
│  │ /api/upload│  │ /api/webhook    │  │ /api/share   │  │
│  │ /api/weather│ │ /api/pace       │  │ /api/export  │  │
│  │ /api/notes │  │ /api/compare    │  │ /api/waypoints│ │
│  └─────┬──────┘  └───────┬─────────┘  └──────┬───────┘  │
│        │                 │                    │           │
│        └─────────────────▼────────────────────┘           │
│                  Access Guard (lib/access-guard.ts)       │
│                  Rate Limiter  (lib/rate-limiter.ts)      │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Supabase                                               │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Auth       │  │ PostgreSQL   │  │ Storage          │ │
│  │ (sessions) │  │ (all tables) │  │ (GPX files)      │ │
│  └────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  External Services                                      │
│  ┌────────────────┐  ┌───────────────┐                  │
│  │ Midtrans Snap  │  │ Open-Meteo    │                  │
│  │ (payment)      │  │ (weather API) │                  │
│  └────────────────┘  └───────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

### Tier Resolution Flow

Every API request that touches a gated feature goes through the same resolution chain:

```
Request arrives at Route Handler
        │
        ▼
Read session cookie → getServerUser()
        │
    authenticated? ─── No ──► tier = "anonymous"
        │ Yes
        ▼
SELECT subscription FROM subscriptions WHERE user_id = $1
AND status IN ('active','grace_period')
ORDER BY created_at DESC LIMIT 1
        │
    row found? ─── No ──► tier = "free"
        │ Yes
        ▼
Is grace_period_ends_at < now() AND status = 'grace_period'?
        │ Yes ──► UPDATE status='free', emit downgrade event
        │             tier = "free"
        │ No
        ▼
    tier = "pro"
        │
        ▼
Access Guard checks tier against feature requirements
```

### Subscription State Machine

```
            ┌──────────────────────────────────────┐
            │                                      │
  Register  ▼       Payment success                │
  ───────► FREE ──────────────────────────► ACTIVE ─┘
            ▲            ▲                    │
            │            │ Payment while      │ Payment failure
            │            │ in grace period    ▼
            │            └────────────── GRACE_PERIOD
            │                                 │
            │         grace_period_ends_at    │
            └─────────────────────────────────┘
                         expires

Cancellation: ACTIVE ─► CANCELLED
              (access until period_end, then ─► FREE at next request)
```

---

## Components and Interfaces

### New Pages

| Route | Component | Description |
|---|---|---|
| `/auth/login` | `app/auth/login/page.tsx` | Email/password + Google OAuth login |
| `/auth/register` | `app/auth/register/page.tsx` | Registration form |
| `/auth/verify-email` | `app/auth/verify-email/page.tsx` | Post-registration verification prompt |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | Password reset request + confirmation |
| `/pricing` | `app/pricing/page.tsx` | Tier comparison + checkout CTA |
| `/account` | `app/account/page.tsx` | Subscription management, saved routes, billing |
| `/routes` | `app/routes/page.tsx` | Saved route list for authenticated users |

### New API Route Handlers

| Path | Method | Auth required | Tier required |
|---|---|---|---|
| `/api/auth/register` | POST | No | — |
| `/api/auth/logout` | POST | Yes | Any |
| `/api/upload` | POST | No | Any (rate-limited) |
| `/api/routes` | GET | Yes | Free+ |
| `/api/routes` | POST | Yes | Free+ |
| `/api/routes/[id]` | GET | Yes | Free+ |
| `/api/routes/[id]` | PATCH | Yes | Free+ (read-only guard for downgraded) |
| `/api/routes/[id]` | DELETE | Yes | Free+ |
| `/api/waypoints` | POST/PUT/DELETE | Yes | **Pro** |
| `/api/weather` | GET | Yes | **Pro** |
| `/api/weather/hourly` | GET | Yes | **Pro** |
| `/api/pace` | POST | Yes | **Pro** |
| `/api/export/pdf` | POST | Yes | **Pro** |
| `/api/share` | POST | Yes | **Pro** |
| `/api/share/[token]` | GET | No | — (public) |
| `/api/share/[token]` | DELETE | Yes | Free+ (owner) |
| `/api/compare` | POST | Yes | **Pro** |
| `/api/notes/[routeId]` | GET/POST | Yes | **Pro** |
| `/api/subscription/checkout` | POST | Yes | Free+ |
| `/api/subscription/cancel` | POST | Yes | Pro |
| `/api/subscription/portal` | GET | Yes | Free+ |
| `/api/webhook/midtrans` | POST | No (HMAC) | — |

### Core Library Modules

**`lib/supabase-server.ts`** — SSR Supabase client factory:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

**`lib/access-guard.ts`** — Tier resolution and feature gate enforcement:
```typescript
export type UserTier = 'anonymous' | 'free' | 'pro'

export interface TierContext {
  tier: UserTier
  userId: string | null
  subscriptionId: string | null
  gracePeriodEndsAt: Date | null
}

export async function resolveTier(request: Request): Promise<TierContext>
export function requireTier(ctx: TierContext, minimum: UserTier): void // throws 403 Response
export function requireFeature(ctx: TierContext, feature: ProFeature): void
```

**`lib/rate-limiter.ts`** — Rolling 24-hour window:
```typescript
export async function checkRateLimit(
  identifier: string,        // IP or user_id
  identifierType: 'ip' | 'user',
  tier: UserTier
): Promise<{ allowed: boolean; count: number; limit: number; resetAt: Date }>
```

**`lib/subscription.ts`** — Subscription lifecycle helpers:
```typescript
export async function getActiveSubscription(userId: string): Promise<Subscription | null>
export async function applyIntroductoryPrice(userId: string): Promise<boolean> // atomic
export async function beginGracePeriod(subscriptionId: string): Promise<void>
export async function expireGracePeriod(subscriptionId: string): Promise<void>
export async function cancelSubscription(subscriptionId: string): Promise<void>
export async function downgradeUserToFree(userId: string): Promise<void>
```

### UI Components

**`components/auth/AuthModal.tsx`** — Slide-over modal for login/register triggered from any page. Accepts `mode: 'login' | 'register'` and `redirectAfter?: string`.

**`components/pro/ProGate.tsx`** — Wrapper component that renders children for Pro users and renders the gated fallback for others:
```typescript
interface ProGateProps {
  feature: ProFeature
  tier: UserTier
  fallback: React.ReactNode
  children: React.ReactNode
}
```

**`components/pro/UpgradePrompt.tsx`** — Inline CTA card. Variants: `'tooltip'` (waypoint buttons), `'overlay'` (weather blur), `'inline'` (pace table), `'sheet'` (bottom sheet for save limit).

**`components/pro/GracePeriodBanner.tsx`** — Sticky top banner during grace period. Dismissible per-session but re-appears on next login. Reads `gracePeriodEndsAt` from context.

**`components/pro/PricingCard.tsx`** — Single tier card used on `/pricing`. Accepts `tier`, `features[]`, `price`, `introPrice?`, `isRecommended`, `ctaLabel`.

**`components/routes/RouteList.tsx`** — Paginated list of saved routes. Shows read-only badge for downgraded routes beyond 3-route limit.

**`components/routes/SaveRouteButton.tsx`** — Button that enforces save limits before persisting. Shows `UpgradePrompt` in bottom-sheet mode when limit reached.

**Updated existing components:**

- `components/trail/WaypointPanel.tsx` — Accepts `tier: UserTier`. When `tier !== 'pro'`, all action buttons render as disabled with `UpgradePrompt` tooltip variant.
- `components/trail/WeatherForecast.tsx` — Accepts `tier: UserTier`. When `tier !== 'pro'`, renders blurred content overlay + `UpgradePrompt` overlay variant instead of fetching weather data from client. Weather data is now fetched via `/api/weather` (server-side, gated).
- `components/trail/Header.tsx` — Expanded to show user avatar/tier badge + login button when unauthenticated.
- `components/trail/ElevationChart.tsx` — Accepts `showWaypointLabels: boolean` (set to `false` for non-Pro).

### Context Providers

**`contexts/AuthContext.tsx`** — Wraps the app at layout level:
```typescript
interface AuthContextValue {
  user: User | null
  tier: UserTier
  gracePeriodEndsAt: Date | null
  introUsed: boolean
  isLoading: boolean
  signOut: () => Promise<void>
  refreshTier: () => Promise<void>
}
```

The provider hydrates from a `/api/auth/me` call on mount and listens to `supabase.auth.onAuthStateChange` for session changes.

---

## Data Models

### New and Modified Supabase Tables

#### `profiles`
Extends `auth.users` with application-level data. Created automatically via `auth.users` trigger.

```sql
CREATE TABLE public.profiles (
  id                     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name           TEXT,
  email                  TEXT NOT NULL,
  email_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  intro_price_used       BOOLEAN NOT NULL DEFAULT FALSE,  -- Req 12.1: per-account flag
  intro_price_used_at    TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Populated by trigger on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

RLS:
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Service role bypasses RLS for webhook processing
```

#### `subscriptions`

```sql
CREATE TYPE subscription_status AS ENUM (
  'active', 'grace_period', 'cancelled', 'expired'
);
CREATE TYPE subscription_plan AS ENUM ('monthly', 'annual');

CREATE TABLE public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  midtrans_order_id      TEXT UNIQUE NOT NULL,
  midtrans_transaction_id TEXT,
  plan                   subscription_plan NOT NULL,
  status                 subscription_status NOT NULL DEFAULT 'active',
  amount_charged         INTEGER NOT NULL,           -- in IDR, e.g. 29000
  introductory_applied   BOOLEAN NOT NULL DEFAULT FALSE,
  current_period_start   TIMESTAMPTZ NOT NULL,
  current_period_end     TIMESTAMPTZ NOT NULL,
  grace_period_ends_at   TIMESTAMPTZ,               -- set on payment failure
  cancelled_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
```

RLS:
```sql
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
-- All writes done via service-role in webhook/API handlers
```

#### `saved_routes`

Replaces the existing telemetry-only `user_routes` table for route persistence. The old `user_routes` table is kept for backward-compatible telemetry writes.

```sql
CREATE TYPE route_access AS ENUM ('read_write', 'read_only');

CREATE TABLE public.saved_routes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name         TEXT NOT NULL,
  race_name         TEXT,
  race_date         DATE,
  route_data        JSONB NOT NULL,                 -- serialized GPXData
  gpx_storage_path  TEXT,                           -- Supabase Storage path
  file_size_bytes   INTEGER NOT NULL,
  access_level      route_access NOT NULL DEFAULT 'read_write',
  deleted_at        TIMESTAMPTZ,                    -- NULL = active, SET = soft-deleted
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_routes_user_id ON public.saved_routes(user_id);
CREATE INDEX idx_saved_routes_user_active ON public.saved_routes(user_id) WHERE deleted_at IS NULL;
```

RLS:
```sql
ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own routes" ON public.saved_routes
  FOR ALL USING (auth.uid() = user_id);
-- Share link access is handled by service-role in /api/share/[token]
```

#### `share_links`

```sql
CREATE TABLE public.share_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id      UUID NOT NULL REFERENCES public.saved_routes(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token         TEXT UNIQUE NOT NULL,               -- 256-bit hex (32 bytes)
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX idx_share_links_token ON public.share_links(token) WHERE is_active = TRUE;
CREATE INDEX idx_share_links_route_id ON public.share_links(route_id);
```

RLS:
```sql
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage share links" ON public.share_links
  FOR ALL USING (auth.uid() = user_id);
-- Public read of active tokens done via service-role in API handler
```

#### `rate_limit_windows`

```sql
CREATE TABLE public.rate_limit_windows (
  id              BIGSERIAL PRIMARY KEY,
  identifier      TEXT NOT NULL,         -- IP address or user UUID
  identifier_type TEXT NOT NULL,         -- 'ip' or 'user'
  window_start    TIMESTAMPTZ NOT NULL,
  count           INTEGER NOT NULL DEFAULT 1,
  UNIQUE (identifier, identifier_type, window_start)
);

CREATE INDEX idx_rate_limit_identifier ON public.rate_limit_windows(identifier, identifier_type, window_start DESC);
```

Note: Individual upload events within the 24-hour window are tracked by their `window_start` being the timestamp of the upload. The rate limiter queries `COUNT(*) WHERE identifier = $1 AND window_start > now() - INTERVAL '24 hours'` to compute the rolling count.

RLS: Disabled — all access via service-role.

#### `route_notes`

```sql
CREATE TABLE public.route_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID NOT NULL REFERENCES public.saved_routes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     JSONB NOT NULL DEFAULT '{}',  -- { nutrition: string, gear: string }
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS:
```sql
ALTER TABLE public.route_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes" ON public.route_notes FOR ALL USING (auth.uid() = user_id);
```

#### `dunning_log`

```sql
CREATE TABLE public.dunning_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id   UUID NOT NULL REFERENCES public.subscriptions(id),
  email_type        TEXT NOT NULL,  -- 'grace_period_start' | 'grace_period_day_before'
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_status   TEXT            -- 'sent' | 'failed'
);
```

### Deleted Account Email Index

For introductory price integrity across account deletion + re-registration (Req 12.6):

```sql
CREATE TABLE public.deleted_account_flags (
  email_hash     TEXT PRIMARY KEY,  -- SHA-256 of lowercase email
  intro_used     BOOLEAN NOT NULL DEFAULT FALSE,
  flagged_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

This table is written by a `auth.users` DELETE trigger and read during new account registration before the profile row is created.

---

## Access Guard Middleware

### `middleware.ts`

The Next.js middleware runs on every request matching the configured matcher. Its two responsibilities are (1) refreshing the Supabase session cookie so it never expires silently mid-session and (2) redirecting unauthenticated users away from protected pages.

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PAGES = ['/account', '/routes']
const AUTH_PAGES     = ['/auth/login', '/auth/register']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(),
                 setAll: (c) => c.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } }
  )

  // Refresh session — critical for 7-day persistence
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  if (PROTECTED_PAGES.some(p => path.startsWith(p)) && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectAfter', path)
    return NextResponse.redirect(loginUrl)
  }

  if (AUTH_PAGES.some(p => path.startsWith(p)) && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
```

### `lib/access-guard.ts` — Route Handler Usage

Every gated Route Handler calls `resolveTier` as its first action:

```typescript
export async function resolveTier(cookieStore: ReadonlyRequestCookies): Promise<TierContext> {
  try {
    const supabase = createSupabaseServerClient(cookieStore)
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) return { tier: 'anonymous', userId: null, subscriptionId: null, gracePeriodEndsAt: null }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, status, current_period_end, grace_period_ends_at')
      .eq('user_id', user.id)
      .in('status', ['active', 'grace_period', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!sub) return { tier: 'free', userId: user.id, subscriptionId: null, gracePeriodEndsAt: null }

    const now = new Date()

    if (sub.status === 'grace_period' && new Date(sub.grace_period_ends_at) < now) {
      // Lazy expiry: expire on first request after deadline
      await expireGracePeriod(sub.id)
      return { tier: 'free', userId: user.id, subscriptionId: sub.id, gracePeriodEndsAt: null }
    }

    if (sub.status === 'cancelled' && new Date(sub.current_period_end) < now) {
      return { tier: 'free', userId: user.id, subscriptionId: sub.id, gracePeriodEndsAt: null }
    }

    if (sub.status === 'active' || sub.status === 'grace_period' ||
        (sub.status === 'cancelled' && new Date(sub.current_period_end) >= now)) {
      return {
        tier: 'pro',
        userId: user.id,
        subscriptionId: sub.id,
        gracePeriodEndsAt: sub.grace_period_ends_at ? new Date(sub.grace_period_ends_at) : null,
      }
    }

    return { tier: 'free', userId: user.id, subscriptionId: null, gracePeriodEndsAt: null }
  } catch {
    // Req 2.8: indeterminate result → 503
    throw new Response(JSON.stringify({ error: { code: 'TIER_GUARD_UNAVAILABLE', message: 'Access guard unavailable' } }), { status: 503 })
  }
}

export function requireTier(ctx: TierContext, minimum: 'free' | 'pro'): void {
  const rank = { anonymous: 0, free: 1, pro: 2 }
  if (rank[ctx.tier] < rank[minimum]) {
    throw new Response(JSON.stringify({ error: { code: 'TIER_INSUFFICIENT', message: 'Pro subscription required', tier: ctx.tier } }), { status: 403 })
  }
}
```

---

## Rate Limiter Design

### Rolling 24-Hour Window Algorithm

The rate limiter stores one row per upload event in `rate_limit_windows`. To count, it queries the number of rows in the last 24 hours using `window_start > now() - INTERVAL '24 hours'`.

```typescript
// lib/rate-limiter.ts
export async function checkRateLimit(
  identifier: string,
  identifierType: 'ip' | 'user',
  tier: UserTier
): Promise<RateLimitResult> {
  const limit = tier === 'anonymous' ? 10 : tier === 'free' ? 50 : Infinity
  if (limit === Infinity) return { allowed: true, count: 0, limit: Infinity, resetAt: new Date() }

  const supabase = createSupabaseAdminClient()
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('rate_limit_windows')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('identifier_type', identifierType)
    .gt('window_start', windowStart)

  const currentCount = count ?? 0
  return {
    allowed: currentCount < limit,
    count: currentCount,
    limit,
    resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }
}

export async function recordUpload(identifier: string, identifierType: 'ip' | 'user'): Promise<void> {
  const supabase = createSupabaseAdminClient()
  await supabase.from('rate_limit_windows').insert({
    identifier,
    identifier_type: identifierType,
    window_start: new Date().toISOString(),
    count: 1,
  })
}
```

The `POST /api/upload` handler calls `checkRateLimit` **before** processing the file. Only if `allowed === true` does it call `recordUpload` (blocked uploads never increment the count, satisfying Req 6.6).

A nightly Supabase Edge Function cleans rows older than 25 hours to keep the table bounded:
```sql
DELETE FROM public.rate_limit_windows WHERE window_start < now() - INTERVAL '25 hours';
```

---

## Midtrans Integration

### Checkout Flow

```
User clicks "Upgrade to Pro"
         │
         ▼
POST /api/subscription/checkout
  1. resolveTier() → must be 'free' + email_verified
  2. Read profiles.intro_price_used
  3. Determine amount: intro_price_used ? 49000 : 29000
  4. Generate order_id = `pyt_${userId}_${Date.now()}`
  5. POST to Midtrans /snap/v1/transactions (server-side, using server key)
     Body: { transaction_details: { order_id, gross_amount },
             customer_details: { email }, ... }
  6. Receive { token: snap_token, redirect_url }
  7. Return { snapToken, amount } to client
         │
         ▼
Client receives snapToken
  window.snap.pay(snapToken, {
    onSuccess: () => router.push('/account?upgraded=1'),
    onError:   () => showError(),
    onPending: () => router.push('/account?pending=1'),
  })
         │
         ▼
Midtrans calls POST /api/webhook/midtrans
  (see Webhook Handler below)
```

### Webhook Handler

The webhook handler at `/api/webhook/midtrans` is the authoritative source of truth for subscription state. It uses HMAC-SHA512 to verify authenticity.

```typescript
// Midtrans signature verification
const signatureKey = SHA512(order_id + status_code + gross_amount + SERVER_KEY)
if (signatureKey !== notification.signature_key) return new Response(null, { status: 400 })
```

Event handling:

| Midtrans `transaction_status` | Action |
|---|---|
| `capture` / `settlement` | `activateSubscription(order_id, userId)` — atomically set `intro_price_used` and insert subscription row |
| `pending` | Log, no tier change |
| `deny` / `expire` | If existing active subscription: `beginGracePeriod(subscriptionId)` |
| `cancel` | `cancelSubscription(subscriptionId)` — set `status='cancelled'`, `cancelled_at=now()` |

### Introductory Price Atomic Check-and-Set

The intro price flag must be set atomically with subscription creation to prevent two simultaneous payments both claiming the intro price (Req 12.7):

```sql
-- Called inside the webhook handler, within a transaction
WITH claim AS (
  UPDATE public.profiles
  SET    intro_price_used = TRUE,
         intro_price_used_at = now()
  WHERE  id = $1
  AND    intro_price_used = FALSE
  RETURNING id
)
INSERT INTO public.subscriptions (user_id, midtrans_order_id, plan, status, amount_charged,
                                   introductory_applied, current_period_start, current_period_end)
SELECT $1, $2, $3, 'active', 
       CASE WHEN EXISTS(SELECT 1 FROM claim) THEN 29000 ELSE 49000 END,
       EXISTS(SELECT 1 FROM claim),
       now(), now() + INTERVAL '30 days'
RETURNING id;
```

If the `UPDATE` in the CTE matches 0 rows (flag already set), `introductory_applied` is set to `FALSE` and the standard price is charged.

### Subscription Lifecycle State Transitions

```typescript
// lib/subscription.ts

export async function activateSubscription(orderId: string, userId: string, plan: 'monthly' | 'annual') {
  // Atomic intro price check-and-set + subscription insert (see SQL above)
}

export async function beginGracePeriod(subscriptionId: string) {
  const gracePeriodEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  await supabase.from('subscriptions').update({
    status: 'grace_period',
    grace_period_ends_at: gracePeriodEnd.toISOString(),
  }).eq('id', subscriptionId)

  await scheduleDunningEmails(subscriptionId, gracePeriodEnd)
}

export async function expireGracePeriod(subscriptionId: string) {
  await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', subscriptionId)
  const { data: sub } = await supabase.from('subscriptions').select('user_id').eq('id', subscriptionId).single()
  if (sub) await downgradeUserToFree(sub.user_id)
}

export async function cancelSubscription(subscriptionId: string) {
  await supabase.from('subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', subscriptionId)
  // Access maintained until current_period_end — enforced by resolveTier()
}

export async function downgradeUserToFree(userId: string) {
  // Mark excess routes read-only (keep top 3 by created_at DESC)
  const { data: routes } = await supabase
    .from('saved_routes')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (routes && routes.length > 3) {
    const excessIds = routes.slice(3).map(r => r.id)
    await supabase.from('saved_routes').update({ access_level: 'read_only' }).in('id', excessIds)
  }
}
```

---

## UI Component Architecture

### Upgrade Prompt Variants

The `UpgradePrompt` component handles four visual patterns dictated by Req 4:

```typescript
type UpgradeVariant = 'tooltip' | 'overlay' | 'inline' | 'sheet'

interface UpgradePromptProps {
  feature: ProFeature     // e.g. 'waypoints' | 'weather' | 'pace' | 'export'
  variant: UpgradeVariant
  onDismiss?: () => void
}
```

**`tooltip`** — Wraps individual buttons (waypoint add/edit/delete). Renders a Radix UI `Tooltip` with "Pro feature — Upgrade" label. The wrapped button has `disabled={true}` and `cursor-not-allowed`.

**`overlay`** — Weather forecast section. Renders a `backdrop-blur-sm` div over the content with a centered card containing the CTA. The underlying content is rendered but visually inaccessible.

**`inline`** — Pace estimator table. The table renders with `—` in all data cells; a banner above the table explains the gate.

**`sheet`** — Save limit reached. A bottom sheet (`framer-motion` slide-up from bottom) that offers "Upgrade to Pro" or "Delete a route to free space". Not a blocking modal — the user can still scroll the page behind it.

### Dismissal Persistence

```typescript
// hooks/useUpgradePromptDismissal.ts
export function useUpgradePromptDismissal(feature: ProFeature) {
  const key = `upgrade_dismissed_${feature}`
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem(key) === '1' : false
  )

  const dismiss = useCallback(() => {
    sessionStorage.setItem(key, '1')
    setDismissed(true)
  }, [key])

  return { dismissed, dismiss }
}
```

### Pro Feature Wrapping Pattern

Existing components are wrapped rather than rewritten:

```tsx
// In app/page.tsx — WaypointPanel pro wrapping
<ProGate
  feature="waypoints"
  tier={tier}
  fallback={
    <WaypointPanel
      {...waypointProps}
      tier="free"  // disables all action buttons, shows tooltips
    />
  }
>
  <WaypointPanel {...waypointProps} tier="pro" />
</ProGate>
```

The `ProGate` component itself is transparent for Pro users — it simply renders `children`. For non-Pro users it renders `fallback`. This means the existing component logic is unchanged for Pro users.

### New Pages

**`/pricing`** — Static-ish server component that fetches the user's `intro_price_used` from the session. Renders three `PricingCard` components side by side on desktop, stacked on mobile. The Pro card has a "Most Popular" badge and a highlighted border. The introductory price is shown with a `"Intro price"` badge when eligible.

**`/account`** — Protected server component. Shows:
- Current subscription status + next billing date
- "Cancel subscription" CTA (confirms before calling `/api/subscription/cancel`)
- Saved routes list (`RouteList`)
- Billing history

**`/auth/login` and `/auth/register`** — Client components with controlled form state. Password field shows inline validation hints (uppercase, lowercase, number indicators). Google OAuth button triggers `supabase.auth.signInWithOAuth({ provider: 'google' })` client-side.

### Header Updates

`Header.tsx` receives `user` and `tier` props from the layout. When authenticated:
- Shows user avatar (initials fallback) + a `ProBadge` chip if tier is 'pro'
- Shows "My Routes" link
- Shows dropdown with "Account", "Pricing", "Sign out"

When unauthenticated:
- Shows "Log in" and "Sign up" buttons

---

## Share Link System

### Token Generation

Tokens use Node's `crypto.randomBytes(32)` (256 bits), hex-encoded to 64 characters. This exceeds the 128-bit minimum in Req 11.2 with a 2× safety margin.

```typescript
// lib/share-token.ts
import { randomBytes } from 'crypto'

export function generateShareToken(): string {
  return randomBytes(32).toString('hex')  // 64 hex chars = 256 bits
}
```

### Share Link Creation Flow

```
POST /api/share
  1. resolveTier() → requireTier('pro')
  2. Verify route belongs to user
  3. Count existing active share links for route — must be < 5 (Req 11.2)
  4. Generate token = generateShareToken()
  5. INSERT INTO share_links (route_id, user_id, token, is_active=true)
  6. Return { url: `https://planyourtrail.run/share/${token}` }
```

### Public Share Access

```
GET /api/share/[token]
  1. No auth required
  2. SELECT route_id FROM share_links WHERE token=$1 AND is_active=TRUE
  3. If not found → 404
  4. SELECT route_data FROM saved_routes WHERE id=$routeId AND deleted_at IS NULL
  5. If not found (soft-deleted) → 404 (Req 11.6)
  6. Return route_data
```

The existing `app/share/[id]/page.tsx` is migrated to use tokens instead of raw UUIDs. The new URL scheme is `/share/[token]` where `token` is the 64-character hex string. Old UUID-based share links (from the pre-monetization `shared_routes` table) are served from a compatibility redirect at `/share/legacy/[id]`.

### Share Link Revocation

```
DELETE /api/share/[token]
  1. resolveTier() → requireTier('free') — any authenticated user
  2. Verify share link belongs to requesting user
  3. UPDATE share_links SET is_active=FALSE, revoked_at=now() WHERE token=$1
  4. The access-guard check in GET /api/share/[token] will return 404 on next request
  5. Return 204
```

---

## Route Storage and Soft Delete

### Save Route Flow

```
POST /api/routes
  1. resolveTier() — must be 'free' or 'pro'
  2. If tier === 'free': count active routes
     If count >= 3 → return 403 ROUTE_LIMIT_REACHED
  3. Parse and validate route_data payload
  4. Check file_size_bytes against tier limit (10 MB free, 25 MB pro)
  5. INSERT INTO saved_routes (user_id, file_name, race_name, race_date, route_data, file_size_bytes)
  6. Return { id, created_at }
```

### Soft Delete

```
DELETE /api/routes/[id]
  1. Auth check — route must belong to user
  2. UPDATE saved_routes SET deleted_at=now() WHERE id=$1
  3. UPDATE share_links SET is_active=FALSE WHERE route_id=$1 (deactivates links immediately)
  4. Return 204
```

### 30-Day Cleanup Edge Function

A Supabase Edge Function scheduled via `pg_cron` runs nightly at 02:00 UTC:

```sql
-- Permanent deletion of expired soft-deleted routes
DELETE FROM public.saved_routes
WHERE deleted_at IS NOT NULL
AND deleted_at < now() - INTERVAL '30 days';
```

### Post-Sign-Up Auto-Save

When an Anonymous user registers while GPX results are in the browser session (Req 7.3), the client-side `AuthContext` listens for `SIGNED_IN` events and triggers an auto-save:

```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && pendingGpxData) {
    try {
      await fetch('/api/routes', { method: 'POST', body: JSON.stringify(pendingGpxData) })
      clearPendingGpxData()
    } catch {
      showAutoSaveError()  // Req 5.9 / 7.4
    }
  }
})
```

The `pendingGpxData` is stored in a React ref (not sessionStorage) to avoid serialization overhead for large GPX payloads.

---

## Session Persistence

### Supabase SSR Setup

**`lib/supabase-server.ts`** exports two clients:

1. `createSupabaseServerClient(cookieStore)` — uses the anon key, reads/writes cookies, used in all Route Handlers and Server Components.
2. `createSupabaseAdminClient()` — uses the service-role key, bypasses RLS, used only in webhook handlers and scheduled functions.

### Cookie Configuration

Supabase's `@supabase/ssr` package manages cookie lifecycle. Session cookies are HttpOnly, SameSite=Lax, and set with `max-age` aligned to the 7-day session duration. The middleware's `getUser()` call automatically refreshes the token when the access token nears expiry, extending the session up to 7 days from the last activity.

### Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-side only, never in NEXT_PUBLIC_
MIDTRANS_SERVER_KEY=              # server-side only
MIDTRANS_CLIENT_KEY=              # safe for client (snap.js init)
MIDTRANS_WEBHOOK_SECRET=          # for HMAC verification
NEXT_PUBLIC_APP_URL=              # e.g. https://planyourtrail.run
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Tier Resolution is Total and Deterministic

*For any* combination of authentication state (unauthenticated / authenticated) and subscription record state (none / active / grace\_period with future expiry / grace\_period with past expiry / cancelled within period\_end / cancelled past period\_end), `resolveTier()` must return exactly one value from `{ 'anonymous', 'free', 'pro' }` and must never return `null`, `undefined`, or throw an unhandled error.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.9**

---

### Property 2: Registration Produces an Immediately Usable Free Account

*For any* valid (email, password) pair where the email is not already registered, completing the registration flow must result in `resolveTier()` returning `'free'` for that user's session — without requiring email verification.

**Validates: Requirements 1.1, 1.5**

---

### Property 3: Unverified Email Blocks Pro Upgrade

*For any* authenticated user whose `email_verified` flag is `false`, calling `POST /api/subscription/checkout` must return a 403 response without creating a subscription record or charging the payment gateway.

**Validates: Requirements 1.6**

---

### Property 4: Pro-Gated Endpoints Deny Non-Pro Tiers Without Side Effects

*For any* API endpoint designated as Pro-only and *for any* request context where `resolveTier()` returns `'anonymous'` or `'free'`, the endpoint must return a 403 response and must not execute any part of the gated operation — meaning no writes to the database, no calls to external services, and no changes to the caller's state.

**Validates: Requirements 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.11**

---

### Property 5: Free-Tier Route Save Limit Enforced at API Level

*For any* Free-tier user who already has exactly 3 active (non-deleted) saved routes, any additional call to `POST /api/routes` must return an error response and must not create a new route record in the database. The pre-existing 3 routes must remain unmodified after the rejected call.

**Validates: Requirements 3.10, 5.1**

---

### Property 6: Rate Limit Rolling Window Only Counts Uploads in the Last 24 Hours

*For any* upload identifier (IP or user ID) and *for any* sequence of upload timestamps, the count returned by `checkRateLimit()` must equal exactly the number of uploads recorded for that identifier with a `window_start` strictly greater than `now() - 24 hours`. Uploads recorded at timestamps older than 24 hours must not contribute to the count.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

---

### Property 7: Blocked Uploads Do Not Increment the Rate Limit Count

*For any* user or IP whose upload count has already reached the applicable tier limit, sending an additional upload request must leave the rate limit count unchanged. The count before the blocked request must equal the count after.

**Validates: Requirements 6.6, 6.7**

---

### Property 8: Introductory Price Flag is Monotone and Atomically Applied

*For any* account, `applyIntroductoryPrice(userId)` must satisfy two invariants:
1. **Monotone**: once `intro_price_used` is set to `true` for an account, no operation (cancellation, plan switch, re-subscription) may set it back to `false`.
2. **Atomic**: given two concurrent calls to `applyIntroductoryPrice()` for the same `userId`, at most one may succeed with the introductory amount — the other must either receive the standard price or be rejected — and the final value of `intro_price_used` in the database must be `true` exactly once.

**Validates: Requirements 8.4, 8.5, 8.6, 12.2, 12.3, 12.7**

---

### Property 9: Soft-Delete Preserves Route Data for the 30-Day Retention Window

*For any* route with `deleted_at` set to a timestamp within the last 30 days, that route must not appear in the user's active route list (queries filtering `WHERE deleted_at IS NULL`) but must still be present in the database and retrievable as a restoration candidate. A route with `deleted_at` older than 30 days must not appear in the restoration candidate list.

**Validates: Requirements 5.6, 5.7**

---

### Property 10: Upgrade Restores Soft-Deleted Routes Within the 30-Day Window

*For any* soft-deleted route belonging to a user where `deleted_at > now() - INTERVAL '30 days'`, calling `restoreSoftDeletedRoutes(userId)` — triggered when the user upgrades from Free to Pro — must set `deleted_at = NULL` on that route, making it appear again in the active route list.

**Validates: Requirements 5.8, 10.5**

---

### Property 11: Pro-to-Free Downgrade Marks Excess Routes Read-Only Without Deleting Them

*For any* Pro user with N active saved routes where N > 3, after `downgradeUserToFree(userId)` is called, all N routes must still exist with `deleted_at IS NULL`. The (N − 3) routes with the oldest `created_at` timestamps must have `access_level = 'read_only'`. The 3 most recently created routes must retain `access_level = 'read_write'`.

**Validates: Requirements 5.10, 5.11, 10.1**

---

### Property 12: Share Link Tokens Meet Minimum Entropy

*For any* call to the share link token generator, the returned token must be a hexadecimal string of at least 64 characters (representing at least 256 bits of cryptographically random data). Across any set of generated tokens, no two tokens may be equal.

**Validates: Requirements 11.2**

---

### Property 13: Revoked Share Links Return 404 on All Subsequent Access

*For any* share link that was previously active (returning 200 with route data), after `DELETE /api/share/[token]` is called and the revocation is acknowledged, all subsequent `GET /api/share/[token]` requests must return a 404 response.

**Validates: Requirements 11.5, 11.6, 10.4**

---

## Error Handling

### API Error Response Format

All API route handlers return a consistent JSON error envelope:

```typescript
interface ApiError {
  error: {
    code: string          // machine-readable, e.g. "TIER_INSUFFICIENT"
    message: string       // human-readable
    tier?: UserTier       // current resolved tier (for 403 responses)
    limit?: number        // applicable limit (for rate limit and save limit responses)
    retryAfter?: number   // seconds until rate limit resets (for 429 responses)
  }
}
```

### Error Codes

| Code | HTTP Status | Trigger |
|---|---|---|
| `TIER_INSUFFICIENT` | 403 | Non-Pro calling Pro endpoint |
| `ROUTE_LIMIT_REACHED` | 403 | Free user saving 4th route |
| `RATE_LIMIT_EXCEEDED` | 429 | Upload count exceeds tier window |
| `FILE_TOO_LARGE` | 413 | File exceeds tier size limit |
| `EMAIL_NOT_VERIFIED` | 403 | Unverified user attempting Pro upgrade |
| `SHARE_LIMIT_REACHED` | 403 | More than 5 share links on one route |
| `SHARE_NOT_FOUND` | 404 | Token doesn't exist or was revoked |
| `PAYMENT_GATEWAY_ERROR` | 503 | Midtrans unavailable at checkout |
| `TIER_GUARD_UNAVAILABLE` | 503 | Access Guard cannot resolve tier |
| `INTRO_PRICE_ALREADY_USED` | 409 | Race condition on intro price claim |

### Midtrans Webhook Error Handling

The `/api/webhook/midtrans` handler verifies the Midtrans signature hash before processing any event. Invalid signatures return 400 immediately. The handler is idempotent on duplicate deliveries — it uses the `midtrans_order_id` as an upsert key and checks `updated_at` to ignore stale webhook replays.

If the webhook handler cannot write to the database, it returns a non-2xx status so Midtrans retries delivery. A separate monitoring alert fires after 3 consecutive webhook failures for the same order ID.

### Grace Period Notification Failures

If the dunning email fails to send (Req 9.5), the failure is recorded in `dunning_log` with `delivery_status = 'failed'`. The in-app `GracePeriodBanner` component is the fallback channel — it reads grace period state on every authenticated page load and renders regardless of email delivery status.

### Database Unavailability

If `resolveTier()` encounters a database error or timeout, the Access Guard returns 503 with code `TIER_GUARD_UNAVAILABLE` as required by Req 2.8. It does not fall back to a default tier.

---

## Testing Strategy

### Dual Testing Approach

This feature uses both unit/example-based tests and property-based tests. Property-based tests cover the correctness properties defined above; unit tests cover specific examples, edge cases, and integration points.

### Property-Based Testing Library

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (TypeScript-native, no additional runtime dependencies)

**Installation**: `npm install --save-dev fast-check`

**Configuration**: Each property test runs a minimum of **200 iterations** (doubled from the standard 100 to stress-test concurrent race conditions in P8).

**Tag format for each test**:
```typescript
// Feature: pro-monetization, Property N: <property_text>
```

### Property Test Implementation Plan

**P1 — Tier Resolution** (`lib/__tests__/access-guard.property.test.ts`)
- Arbitraries: `fc.record({ isAuthenticated: fc.boolean(), subscriptionStatus: fc.option(fc.constantFrom('active','grace_period','cancelled','expired')), gracePeriodEndsAt: fc.option(fc.date()) })`
- Assertion: result is always one of `['anonymous', 'free', 'pro']`

**P2 — Registration Creates Free Account** (`lib/__tests__/auth.property.test.ts`)
- Arbitraries: `fc.record({ email: fc.emailAddress(), password: validPasswordArb })`
- Test: call `register()` → call `resolveTier()` → assert `=== 'free'`
- Use in-memory Supabase mock (supabase-js mock)

**P3 — Unverified User Blocked from Pro Upgrade** (`app/api/subscription/__tests__/checkout.property.test.ts`)
- Arbitraries: generate users with `email_verified = false`
- Assertion: `POST /api/subscription/checkout` returns 403

**P4 — Pro-Gated Endpoints** (`app/api/__tests__/pro-gate.property.test.ts`)
- Arbitraries: `fc.constantFrom(...PRO_GATED_ROUTES)` × `fc.constantFrom('anonymous', 'free')`
- Assertion: response status = 403, no DB write occurred (spy on db client)

**P5 — Route Save Limit** (`app/api/routes/__tests__/save-limit.property.test.ts`)
- Arbitraries: user with exactly 3 routes + arbitrary new route payload
- Assertion: response is error, route count in DB remains 3

**P6 — Rolling Window** (`lib/__tests__/rate-limiter.property.test.ts`)
- Arbitraries: `fc.array(fc.date(), { minLength: 0, maxLength: 100 })` as upload timestamps
- Assertion: `count === timestamps.filter(t => t > now - 24h).length`

**P7 — Blocked Uploads Don't Count** (`lib/__tests__/rate-limiter.property.test.ts`)
- Arbitraries: identifier at limit + arbitrary new upload
- Assertion: count before === count after blocked call

**P8 — Introductory Price Atomicity** (`lib/__tests__/subscription.property.test.ts`)
- Arbitraries: `fc.integer({ min: 2, max: 10 })` concurrent callers
- Assertion: exactly 1 call returns `true` (intro applied), all others return `false`
- Uses a test-local PostgreSQL transaction with `FOR UPDATE` to simulate real concurrency

**P9 — Soft Delete Retention** (`lib/__tests__/route-store.property.test.ts`)
- Arbitraries: `fc.record({ deletedAt: fc.date() })` (past timestamps)
- Assertion: within-30-day routes appear in restoration list; beyond-30-day do not

**P10 — Upgrade Restore** (`lib/__tests__/route-store.property.test.ts`)
- Arbitraries: sets of soft-deleted routes with `deletedAt` within last 30 days
- Assertion: after `restoreSoftDeletedRoutes()`, all appear in active list

**P11 — Downgrade Preserves + Marks Read-Only** (`lib/__tests__/route-store.property.test.ts`)
- Arbitraries: `fc.integer({ min: 4, max: 20 })` routes per user
- Assertion: count unchanged, bottom N-3 have `read_only`, top 3 have `read_write`

**P12 — Share Link Entropy** (`lib/__tests__/share-token.property.test.ts`)
- Arbitraries: `fc.integer({ min: 1, max: 500 })` tokens generated in a batch
- Assertion: each ≥ 64 hex chars, `new Set(tokens).size === tokens.length`

**P13 — Revoked Links Return 404** (`app/api/share/__tests__/revocation.property.test.ts`)
- Arbitraries: array of previously active share link tokens
- Assertion: after revocation, every subsequent GET returns 404

### Unit / Example Tests

Unit tests cover:
- Password validation rules (8–128 chars, uppercase, lowercase, number) — one test per rule violation
- Login lockout threshold — exactly 5 failures then locked
- Midtrans webhook HMAC signature verification — valid and invalid cases
- Introductory price display logic on `/pricing` — 3 scenarios (unauthenticated, verified + unused, verified + used)
- `GracePeriodBanner` renders and re-appears on next login after dismissal
- `UpgradePrompt` dismissal persisted to `sessionStorage` per feature slug
- Share link per-route limit of 5 — attempt to create 6th returns 403

### Integration Tests

Integration tests (against a local Supabase test instance) cover:
- Full registration → login → route save → share link create flow
- Midtrans webhook → subscription activation → tier change flow
- Grace period start → dunning email → in-app banner render
- Soft delete → 30-day cleanup job removes only expired rows
- Downgrade flow: Pro routes → read-only, share links remain accessible

### Component Tests (React Testing Library)

- `ProGate` renders gated fallback for non-Pro, children for Pro
- `WaypointPanel` with `tier='free'`: all action buttons are `disabled`, tooltips present
- `WeatherForecast` with `tier='free'`: content has `filter: blur`, overlay renders
- `PricingCard` renders introductory badge when `introPrice` prop provided
- `GracePeriodBanner` dismisses on click, calls `sessionStorage.setItem`
