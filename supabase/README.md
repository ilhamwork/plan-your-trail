# Supabase Setup for Pro Monetization

This directory contains database migrations and Edge Functions for the PlanYourTrail Pro Monetization feature.

## Structure

```
supabase/
├── config.toml                                      # Supabase local dev configuration
├── migrations/
│   ├── 20250101000000_pro_monetization_schema.sql  # Main schema migration
│   └── 20250101000001_schedule_nightly_cleanup.sql # pg_cron schedule
└── functions/
    └── nightly-cleanup/                             # Edge function for cleanup
        ├── index.ts
        └── deno.json
```

## Prerequisites

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Ensure you have a Supabase project created at https://supabase.com/dashboard

## Deployment Steps

### 1. Link to your Supabase project

```bash
supabase link --project-ref <your-project-ref>
```

### 2. Apply migrations

```bash
# Push migrations to your Supabase project
supabase db push
```

This will create:
- All enums: `subscription_status`, `subscription_plan`, `route_access`
- All tables: `profiles`, `subscriptions`, `saved_routes`, `share_links`, `rate_limit_windows`, `route_notes`, `dunning_log`, `deleted_account_flags`
- All indexes and RLS policies
- Triggers: `handle_new_user()` and `handle_user_deleted()`

### 3. Enable pg_cron extension

In your Supabase dashboard:
1. Go to **Database** → **Extensions**
2. Search for `pg_cron`
3. Enable it

### 4. Configure the nightly cleanup schedule

Edit `migrations/20250101000001_schedule_nightly_cleanup.sql` and replace `<project-ref>` with your actual Supabase project reference ID.

Then apply the schedule migration:

```bash
supabase db push
```

### 5. Set the service role key secret

The pg_cron job needs access to the service role key. Set it as a database config:

```sql
-- Run this in the SQL Editor in Supabase dashboard
ALTER DATABASE postgres SET app.service_role_key = '<your-service-role-key>';
```

Replace `<your-service-role-key>` with your actual service role key from the Supabase dashboard.

### 6. Deploy the Edge Function

```bash
supabase functions deploy nightly-cleanup
```

### 7. Verify the schedule

Check that the cron job is scheduled:

```sql
SELECT * FROM cron.job;
```

You should see a row with `jobname = 'nightly-cleanup'` and `schedule = '0 2 * * *'`.

## Local Development

### Start Supabase locally

```bash
supabase start
```

This will start:
- PostgreSQL database (port 54322)
- Supabase Studio (port 54323)
- Supabase API (port 54321)
- Edge Runtime for functions

### Apply migrations locally

```bash
supabase db reset
```

### Run the edge function locally

```bash
supabase functions serve nightly-cleanup
```

Then trigger it:

```bash
curl -X POST http://localhost:54321/functions/v1/nightly-cleanup \
  -H "Authorization: Bearer <your-local-anon-key>"
```

## Edge Function Details

### nightly-cleanup

**Purpose**: Performs two cleanup operations nightly at 02:00 UTC:
1. Permanently deletes `saved_routes` rows where `deleted_at < now() - INTERVAL '30 days'` (Requirement 5.7)
2. Prunes `rate_limit_windows` rows where `window_start < now() - INTERVAL '25 hours'` (Requirement 6.4)

**Authentication**: Uses service role key (bypasses RLS)

**Schedule**: Daily at 02:00 UTC via pg_cron

**Response**:
```json
{
  "success": true,
  "results": {
    "deletedRoutes": 5,
    "deletedRateLimitWindows": 123
  },
  "ranAt": "2025-01-15T02:00:00.000Z"
}
```

## Troubleshooting

### Migration fails with "type already exists"

If you need to re-run migrations, drop the types first:

```sql
DROP TYPE IF EXISTS public.subscription_status CASCADE;
DROP TYPE IF EXISTS public.subscription_plan CASCADE;
DROP TYPE IF EXISTS public.route_access CASCADE;
```

Then re-run `supabase db push`.

### pg_cron job not running

1. Verify pg_cron is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Check cron job logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
3. Ensure the service role key is set: `SELECT current_setting('app.service_role_key', true);`

### Edge function deployment fails

Ensure you're authenticated:

```bash
supabase login
```

Then retry the deployment.

## Schema Overview

| Table | Purpose | Key Relationships |
|---|---|---|
| `profiles` | User profile data, extends `auth.users` | FK to `auth.users` |
| `subscriptions` | Pro subscription state and billing cycles | FK to `auth.users` |
| `saved_routes` | Persisted GPX routes with soft-delete support | FK to `auth.users` |
| `share_links` | Public share tokens for routes | FK to `saved_routes`, `auth.users` |
| `rate_limit_windows` | Rolling 24-hour upload rate limiting | No FK (accessed via service role) |
| `route_notes` | Pro-only nutrition and gear notes | FK to `saved_routes`, `auth.users` |
| `dunning_log` | Payment failure notification audit trail | FK to `subscriptions`, `auth.users` |
| `deleted_account_flags` | Introductory price integrity across account deletion | No FK (email hash index) |

## Requirements Mapping

- **Req 1.1, 12.1**: `profiles` table with `intro_price_used` flag
- **Req 2.1, 8.1**: `subscriptions` table with status and grace period
- **Req 5.1, 11.1**: `saved_routes` with soft delete and share links
- **Req 6.1**: `rate_limit_windows` for rolling upload limits
- **Req 9.1**: `dunning_log` for grace period notifications
- **Req 12.6**: `deleted_account_flags` + `handle_user_deleted()` trigger

All RLS policies enforce user ownership. Service-role operations (webhooks, cleanup) bypass RLS.
