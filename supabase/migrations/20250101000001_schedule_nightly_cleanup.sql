-- ============================================================
-- Schedule nightly-cleanup Edge Function via pg_cron
-- Requirements: 5.7, 6.4
-- ============================================================
--
-- Prerequisites:
--   1. Enable pg_cron extension in Dashboard → Database → Extensions
--   2. Enable pg_net extension in Dashboard → Database → Extensions
--   3. Store the service role key in Vault (see instructions below)
--
-- HOW TO STORE THE KEY IN VAULT (run once in SQL Editor):
--
--   SELECT vault.create_secret(
--     '<your-service-role-key>',   -- value: your actual service role key
--     'service_role_key',          -- name: used to retrieve it below
--     'Service role key for nightly-cleanup cron job'
--   );
--
-- Get your service role key from:
--   Dashboard → Settings → API → service_role (secret)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage to postgres role (required on some Supabase plans)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule the nightly cleanup at 02:00 UTC every day.
-- Reads service_role_key from Supabase Vault — no ALTER DATABASE needed.
SELECT cron.schedule(
  'nightly-cleanup',
  '0 2 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://bktjlcpeschuzqezuzox.supabase.co/functions/v1/nightly-cleanup',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'service_role_key'
          LIMIT 1
        )
      ),
      body    := '{}'::jsonb
    );
  $$
);
