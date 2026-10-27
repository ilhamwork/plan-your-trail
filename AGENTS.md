# AGENTS.md — PlanYourTrail.run

Context and rules for AI coding assistants (Claude Code, Cursor, Copilot, Codex, etc.).
Read this file fully before writing code. Source of truth for product behavior: `PlanYourTrail_PRD_v2_6.md`.
Architecture detail: `docs/ARCHITECTURE.md`. Plan and estimates: `docs/IMPLEMENTATION_PLAN.md`.

> File name per tool (check your tool's docs): `AGENTS.md` (generic), `CLAUDE.md` (Claude Code),
> `.github/copilot-instructions.md` (Copilot), `.cursor/rules/` (Cursor). Keep one canonical copy and symlink or copy.

## 1. Product

Trail running route analysis SaaS (planyourtrail.run). User uploads a GPX and gets map, elevation profile,
metrics, segments, weather. Three tiers: **Anonymous**, **Free (registered)**, **Pro (not launched yet, 2027)**.
Current phase: **Tahap 1 — Free registered launch** (accounts, saved routes, weather gating, waitlist). No payments yet.

UI copy and emails: Bahasa Indonesia (match existing UI). Code, comments, commits, identifiers: English.

## 2. Locked stack (do not change without asking)

| Area            | Choice                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------- |
| Framework       | Next.js App Router, TypeScript (strict), Node runtime                                        |
| Backend         | Server Actions (mutations) + Route Handlers (auth, cron, downloads, health)                  |
| UI              | Tailwind CSS + shadcn/ui                                                                     |
| Validation      | Zod at every boundary                                                                        |
| DB              | Postgres via `DATABASE_URL` (Supabase Free now, own VPS at Pro launch)                       |
| ORM             | Drizzle, SQL migrations committed in `drizzle/`                                              |
| Auth            | Better Auth on top of the same Postgres. **No Supabase Auth, no `supabase-js` in new code**  |
| Email           | Resend, sent directly from the app                                                           |
| Storage         | Cloudflare R2 (Standard class, free tier) behind the S3-compatible interface (`lib/storage`) |
| Tests           | Vitest (unit/integration) + Playwright (e2e)                                                 |
| Package manager | npm                                                                                          |
| Hosting         | Vercel Hobby until Pro launch, then Docker (`output: "standalone"`) on a VPS                 |

## 3. Hard rules

**Never**

- Import `@supabase/supabase-js`, `@supabase/ssr`, `@vercel/kv`, `@vercel/postgres`, `@vercel/blob`, `@vercel/edge-config` in new code.
- Use edge runtime, ISR that depends on Vercel cache, or logic in `vercel.json`.
- Scatter `isPro` checks in components. All access decisions go through `can()` (section 5).
- Hardcode limits (upload size, route count, rate limits). Read them from `lib/entitlements/config.ts`.
- Query a user-owned table without filtering by `user_id`.
- Edit a migration that was already applied. Add a new one.
- Rely on middleware alone for authorization (it only does optimistic redirects).
- Put secrets in client code or log them. Read env only via `lib/env.ts`.
- Add microservices, queues, or new infrastructure. Keep a well-structured monolith.
- Build payments, Pro features, org/team models, or anything under "Out of scope" (section 11).
- Guess library APIs. For Better Auth, Drizzle, Next.js, Resend, S3 SDK: read the installed version's docs/types first. If unsure, say so.

**Always**

- Validate input with Zod (Server Action args, Route Handler bodies/params, env).
- Check authorization in the server function itself (`requireUser()` + `can()` + ownership).
- Return typed results from Server Actions (section 5).
- Add loading, error, and empty states for every UI.
- Write tests with the code (section 8). Keep CI green: lint, typecheck, test, e2e, Docker build.
- Keep changes small and focused (one task = one PR). Explain non-obvious decisions in a short comment.
- Use Node runtime, plain Postgres features, and `/api/cron/*` routes protected by `CRON_SECRET`.

## 4. Repository layout

```
app/
  (marketing)/            landing
  (app)/analyze/          open to Anonymous
  (app)/routes/           login required
  (app)/account/          login required
  api/auth/[...all]/      Better Auth handler
  api/cron/*/             scheduled jobs (Bearer CRON_SECRET)
  api/routes/[id]/gpx/    redirect to signed URL (owner only)
  api/health/             { status: "ok" }
lib/
  db/                     client.ts, schema.ts, queries/*
  auth/                   getSession, requireUser, signOut
  storage/                putObject, getObject, deleteObject, signedUrl
  entitlements/           config.ts, can.ts
  email/                  Resend wrapper + templates (id)
  weather/                fetch + cache + rate limit
  rate-limit/             Postgres-table limiter
  env-schema.ts, env.ts   validated env (call env(), never process.env directly)
drizzle/                  SQL migrations
tests/                    Vitest (unit + integration)
e2e/                      Playwright
docs/
```

Components contain no business logic. Pages call Server Actions or `lib/*`; `lib/*` modules are the only code that talks to DB, auth, storage, email, weather.

## 5. Contracts

```ts
// Server Action result (use everywhere)
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

// lib/auth
export type SessionUser = { id: string; email: string; plan: "free" | "pro" };
export function getSession(): Promise<{ user: SessionUser } | null>;
export function requireUser(): Promise<SessionUser>;   // throws/redirects when unauthenticated
export function signOut(): Promise<void>;

// lib/storage  (S3 interface; DB stores object keys, never full URLs)
export function putObject(key: string, body: Uint8Array, opts?: { contentType?: string; contentEncoding?: string }): Promise<void>;
export function getObject(key: string): Promise<Uint8Array>;
export function deleteObject(key: string): Promise<void>;
export function signedUrl(key: string, opts: { expiresInSeconds: number; downloadFilename?: string }): Promise<string>;
// GPX key format: gpx/{userId}/{routeId}.gpx.gz
// Provider: Cloudflare R2, Standard class only. Endpoint https://<ACCOUNT_ID>.r2.cloudflarestorage.com, region "auto".
// Verify supported S3 operations and presigning in the R2 docs before implementing.

// lib/entitlements
export type Tier = "anonymous" | "free" | "pro";
export type Feature =
  | "weather_session" | "waypoint_gpx_chart" | "pace_basic" | "save_route" | "download_gpx"
  | "waypoint_management" | "waypoint_user_chart" | "nutrition_notes"
  | "weather_hourly" | "cutoff_estimator" | "export_pdf" | "share_link" | "compare_routes";
export function can(user: SessionUser | null, feature: Feature): boolean;
export function limits(user: SessionUser | null): { maxUploadBytes: number; maxSavedRoutes: number | null };
```

`lib/entitlements/config.ts` (values from PRD v2.5; sizes are binary MB, confirm if it matters):

```ts
const MB = 1024 * 1024;
export const PRO_LAUNCHED = false; // flip at Pro launch (Tahap 3)
export const TIER_LIMITS = {
  anonymous: { maxUploadBytes: 5 * MB,  maxSavedRoutes: 0 },
  free:      { maxUploadBytes: 10 * MB, maxSavedRoutes: 3 },
  pro:       { maxUploadBytes: 20 * MB, maxSavedRoutes: null }, // fair-use cap TBD (PRD 11.2)
} as const;
```

Access matrix (`can()` must implement exactly this):

| Feature                                                                                                                             | Anonymous | Free |              Pro              |
| ----------------------------------------------------------------------------------------------------------------------------------- | :-------: | :--: | :---------------------------: |
| weather_session, waypoint_gpx_chart, pace_basic, save_route, download_gpx                                                           |    no     | yes  |              yes              |
| waypoint_management, waypoint_user_chart, nutrition_notes, weather_hourly, cutoff_estimator, export_pdf, share_link, compare_routes |    no     |  no  | yes, only when `PRO_LAUNCHED` |

Before Pro launch `plan` is always `free`, so Pro-only features (including `waypoint_management`) are locked ("Segera hadir" + early-access waitlist).
Rule: `user != null && proLaunched && user.plan === "pro"`. Anonymous GPX features (map, elevation, metrics, segments, GPX waypoints on the map) are always open.


Owner-scoped queries: every query function for a user-owned table takes `userId` as its first, required parameter
(e.g. `listRoutes(userId)`, `getRoute(userId, routeId)`). Do not export unscoped variants.

## 6. Data model (Drizzle, Postgres)

- Better Auth tables (generate with its CLI): user, session, account, verification. Prefer UUID ids (check its `generateId` option).
- `profile`: `user_id` (pk), `plan` (`free` | `pro`, default `free`), timestamps.
- `route`: `id`, `user_id`, `name`, `metrics` jsonb, `track_simplified` jsonb (downsampled, e.g. Douglas-Peucker), `gpx_object_key`, `hidden` bool default false, `created_at`.
  - Never store raw GPX in a DB column. Original GPX is gzipped into object storage.
  - Free limit counts only non-hidden routes. Delete is permanent (row + object); confirm in UI: "Rute yang dihapus tidak bisa dikembalikan."
- `waitlist`: `user_id`, `feature` (trigger), `survey` jsonb (optional), `created_at`.
- `weather_cache`: `key`, `payload` jsonb, `expires_at` (short TTL).
- `rate_limit`: `key`, `window_start`, `count`.
- `daily_analytics`: already exists, keep working.
- **RLS enabled on every table with no policies** (blocks anon access via Supabase Data API). The app connects as the owner role directly via `DATABASE_URL`. Do not use `auth.uid()` anywhere.
- On Vercel use the pooler connection string; in transaction mode the Postgres driver usually needs prepared statements disabled (check driver docs).

## 7. Product rules to implement exactly

- Upload size limits per tier (client check for fast feedback **and** server check). Messages:
  - Anonymous: "File ini lebih dari 5 MB. Daftar untuk upload sampai 10 MB."
  - Free: "File ini lebih dari 10 MB. Daftar early access Pro untuk upload sampai 20 MB."
- Anonymous analysis must survive the register redirect (temporary browser storage or short-expiry temp area), then be saved to the new account.
- Weather: login required, per-session forecast (morning/afternoon/evening/night). Cache by location/date with short TTL. Rate limit per account (proposal: 20 analyses/day, read from config) plus a global budget alert. Hourly forecast is Pro.
- Prompts (PRD 6.3): show a gating/registration prompt only after the user engaged with results; one CTA per context; no blocking popups; once dismissed, don't show again in the same session.
- Waitlist: one click when logged in; Anonymous is sent to registration first. Record the trigger feature.
- Email verification required for email signups; Google OAuth is the preferred path. Resend free quota is small (daily limit), so keep transactional emails minimal and rate-limit resend (min 60 s per user).
- Analytics events (names fixed): `upload_started`, `analysis_completed`, `locked_feature_viewed`, `register_clicked`, `register_completed`, `route_saved`, `waitlist_joined`, `waypoint_added`, `waypoint_edited`. Include source/context props, no PII.

## 8. Security and testing

Security checklist for every PR touching data or auth:

- [ ] Zod validation on inputs; reject unknown fields where it matters.
- [ ] `requireUser()` + `can()` + ownership check in the server function.
- [ ] Rate limit on auth, weather, upload/save, waitlist endpoints.
- [ ] GPX parsing is bounded (size, point count, no external entity resolution).
- [ ] Signed URLs are short-lived; object keys are not guessable and are checked against the owner.
- [ ] `/api/cron/*` verifies `Authorization: Bearer ${CRON_SECRET}` (verify how the scheduler sends it).
- [ ] No secrets in client bundles or logs.

Testing:

- Vitest for `lib/*` units; integration tests against real Postgres (`DATABASE_URL`, CI service container).
- Required tests: `can()` matrix, owner scoping (user A cannot read/modify user B's route), upload limit enforcement server-side, RLS blocks anon access, env schema.
- Playwright for critical flows: anonymous analyze, register/login, save route (limit 3), download GPX, waitlist, locked states.
- Pin the Better Auth version exactly and keep an e2e login test (patch releases have shipped breaking changes).

## 9. Commands

```bash
npm dev
npm lint && npm typecheck && npm test      # must pass before every PR
npm build && npm test:e2e
docker build -t pyt:local . && docker compose up --build   # portability check, GET /api/health
```

DB commands (Drizzle Kit generate/migrate) are added in E1; use the scripts defined in `package.json`.

## 10. Workflow for the assistant

1. Identify the task ID below (e.g. `E1-T2`) and read the related PRD section.
2. Plan in a few lines, then implement the smallest change that satisfies the acceptance criteria.
3. Write tests alongside. Run lint, typecheck, test locally.
4. Commit with Conventional Commits (`feat(auth): ...`). One task per PR, short-lived branch, PR must pass CI.
5. Ask the maintainer only about items in section 12. For anything else, choose the option consistent with this file and note the assumption in the PR description.
6. Definition of Done: types complete, Zod at boundaries, authz tested, tests green in CI (incl. Docker build), schema changes via new migration, loading/error/empty states, analytics event if relevant, preview deploy works.

## 11. Backlog (Tahap 1) with acceptance criteria

**Out of scope for Tahap 1:** payments/Midtrans, subscription backend, Pro features beyond locked UI, export PDF, share link, compare route, org/team, dashboards, edge runtime, VPS migration (Pro launch).

| ID    | Task                                    | Acceptance criteria                                                                                                                                                                                      |
| ----- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E0    | Foundation                              | CI green (lint, typecheck, Vitest, Playwright, Docker build); `docker compose up` serves `/api/health`; `lib/env.ts` validated by Zod; restricted-imports lint rule on (warn); Vercel preview unaffected |
| E1-T1 | Drizzle schema + migrations             | Tables in section 6 exist via committed SQL migration; RLS enabled on all with no policies                                                                                                               |
| E1-T2 | `lib/db` + owner-scoped helpers         | No unscoped query exported for user-owned tables; works with pooler connection string                                                                                                                    |
| E1-T3 | DB integration tests in CI              | Postgres service container; test proves anon role cannot read tables via Data API (or documented equivalent)                                                                                             |
| E2-T1 | Better Auth + Drizzle adapter           | Session works on Next.js App Router; tables migrated; `profile` row created on signup with `plan = free`                                                                                                 |
| E2-T2 | Google OAuth                            | Login/signup via Google; own client ID via env                                                                                                                                                           |
| E2-T3 | Email verify + reset via Resend         | Indonesian templates; verified domain; resend interval >= 60 s; auth endpoints rate-limited                                                                                                              |
| E2-T4 | `lib/auth` wrapper + UI                 | `getSession/requireUser/signOut` only entry points; sign in/up and account pages with all states                                                                                                         |
| E3    | Entitlements                            | `config.ts`, `can()`, `limits()` match section 5 matrix; unit tests cover every cell                                                                                                                     |
| E4-T1 | `lib/storage`                           | S3 interface with put/get/delete/signedUrl; works against configured endpoint; unit tested with a fake                                                                                                   |
| E4-T2 | Save route                              | Parse + simplify track, gzip original to storage, store key; enforce limit 3 (non-hidden) and size limit server-side; typed `ActionResult`                                                               |
| E4-T3 | List / detail / delete                  | Cross-device access; permanent delete (row + object) with confirmation; owner-only                                                                                                                       |
| E4-T4 | Download original GPX                   | Owner-only signed URL redirect from `/api/routes/[id]/gpx`                                                                                                                                               |
| E4-T5 | Anonymous -> register -> save           | Analysis survives the redirect and is saved to the new account                                                                                                                                           |
| E5-T1 | Weather for logged-in users             | Per-session forecast, cache with TTL, per-account rate limit, graceful fallback when quota is exhausted                                                                                                  |
| E5-T2 | GPX waypoints on elevation chart (Free) | Read-only labels, login required                                                                                                                                                                         |
| E5-T3 | Basic pace estimate (Free)              | Pace input -> total finish time                                                                                                                                                                          |
| E6-T1 | Upload limits per tier                  | Client + server; messages from section 7                                                                                                                                                                 |
| E6-T2 | Locked states + register prompts        | Follow prompt rules (PRD 6.3); `locked_feature_viewed` event                                                                                                                                             |
| E6-T3 | Waitlist                                | One-click for logged-in; stores trigger feature; `waitlist_joined` event                                                                                                                                 |
| E6-T4 | "Segera hadir" component                | Generic locked UI for Pro-only features; waypoint_management is Pro-locked; Anonymous sees a register CTA                                                                   |
| E6-T5 | Analytics events                        | Event list in section 7 wired to funnel (start in Sprint 1 to collect a baseline early)                                                                                                                  |
| E7    | Ops                                     | Scheduled `pg_dump` to offsite + restore drill; keep-alive; quota monitor/alert; cron routes hardened; uptime check                                                                                      |
| E8    | QA and launch                           | E2E critical flows; security checklist pass; beta; launch checklist + rollback                                                                                                                           |

Current focus: Sprint 1 = E0 + E6-T5 (events) + E1-T1/T2.

## 12. Open decisions (ask before assuming)

- R2 free tier has no hard cap (overage is billed): confirm usage alerts are set, and whether activation requires a payment method.
- Weather API provider details and final per-account rate limit (proposal: 20/day).
- Fair-use cap for Pro "unlimited" routes (proposal 200-500) and retention policy for hidden routes (decide before Tahap 3).
- Better Auth user id format (UUID vs string) — verify the supported option in the installed version.

## 13. Prompt templates for the IDE

```
Implement task E1-T2 from AGENTS.md. Follow sections 3, 5, 6 and the acceptance criteria.
Plan first (max 8 lines), then code and tests. Do not add dependencies without saying why.
```

```
Review this diff against AGENTS.md section 3 (hard rules), section 8 (security checklist) and the DoD in section 10.
List violations first, then suggested fixes. Do not rewrite unrelated code.
```
