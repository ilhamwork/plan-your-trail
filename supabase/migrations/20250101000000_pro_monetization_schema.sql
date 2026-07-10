-- ============================================================
-- Pro Monetization Schema Migration
-- ============================================================
-- Requirements: 1.1, 2.1, 5.1, 6.1, 8.1, 9.1, 11.1, 12.1
-- Idempotent: all objects use DROP IF EXISTS / CREATE OR REPLACE
-- ============================================================

-- ----------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------

DROP TYPE IF EXISTS public.subscription_status CASCADE;
CREATE TYPE public.subscription_status AS ENUM (
  'active',
  'grace_period',
  'cancelled',
  'expired'
);

DROP TYPE IF EXISTS public.subscription_plan CASCADE;
CREATE TYPE public.subscription_plan AS ENUM (
  'monthly',
  'annual'
);

DROP TYPE IF EXISTS public.route_access CASCADE;
CREATE TYPE public.route_access AS ENUM (
  'read_write',
  'read_only'
);

-- ----------------------------------------------------------------
-- 2. PROFILES
-- Requirement 1.1, 12.1
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        TEXT,
  email               TEXT        NOT NULL,
  email_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
  intro_price_used    BOOLEAN     NOT NULL DEFAULT FALSE,
  intro_price_used_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
-- 3. SUBSCRIPTIONS
-- Requirement 2.1, 8.1
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID                       NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  midtrans_order_id       TEXT                       UNIQUE NOT NULL,
  midtrans_transaction_id TEXT,
  plan                    public.subscription_plan   NOT NULL,
  status                  public.subscription_status NOT NULL DEFAULT 'active',
  amount_charged          INTEGER                    NOT NULL,
  introductory_applied    BOOLEAN                    NOT NULL DEFAULT FALSE,
  current_period_start    TIMESTAMPTZ                NOT NULL,
  current_period_end      TIMESTAMPTZ                NOT NULL,
  grace_period_ends_at    TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ                NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ                NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own subscriptions" ON public.subscriptions;
CREATE POLICY "Users read own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 4. SAVED_ROUTES
-- Requirement 5.1, 11.1
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.saved_routes (
  id               UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID                NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name        TEXT                NOT NULL,
  race_name        TEXT,
  race_date        DATE,
  route_data       JSONB               NOT NULL,
  gpx_storage_path TEXT,
  file_size_bytes  INTEGER             NOT NULL,
  access_level     public.route_access NOT NULL DEFAULT 'read_write',
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ         NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id     ON public.saved_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_routes_user_active ON public.saved_routes(user_id) WHERE deleted_at IS NULL;

ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own routes" ON public.saved_routes;
CREATE POLICY "Users access own routes"
  ON public.saved_routes FOR ALL
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 5. SHARE_LINKS
-- Requirement 11.1
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.share_links (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id   UUID        NOT NULL REFERENCES public.saved_routes(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT        UNIQUE NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_share_links_token    ON public.share_links(token) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_share_links_route_id ON public.share_links(route_id);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage share links" ON public.share_links;
CREATE POLICY "Owners manage share links"
  ON public.share_links FOR ALL
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 6. RATE_LIMIT_WINDOWS
-- Requirement 6.1 — RLS disabled, all access via service-role
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rate_limit_windows (
  id              BIGSERIAL   PRIMARY KEY,
  identifier      TEXT        NOT NULL,
  identifier_type TEXT        NOT NULL,
  window_start    TIMESTAMPTZ NOT NULL,
  count           INTEGER     NOT NULL DEFAULT 1,
  UNIQUE (identifier, identifier_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier
  ON public.rate_limit_windows(identifier, identifier_type, window_start DESC);

-- ----------------------------------------------------------------
-- 7. ROUTE_NOTES
-- Requirement 9.1
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.route_notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id   UUID        NOT NULL REFERENCES public.saved_routes(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.route_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notes" ON public.route_notes;
CREATE POLICY "Users manage own notes"
  ON public.route_notes FOR ALL
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 8. DUNNING_LOG
-- Requirement 9.1
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.dunning_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID        NOT NULL REFERENCES public.subscriptions(id),
  email_type      TEXT        NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_status TEXT
);

-- ----------------------------------------------------------------
-- 9. DELETED_ACCOUNT_FLAGS
-- Requirement 12.1, 12.6
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deleted_account_flags (
  email_hash TEXT        PRIMARY KEY,
  intro_used BOOLEAN     NOT NULL DEFAULT FALSE,
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 10. TRIGGER: deleted_account_flags on user deletion
-- Requirement 12.6
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_intro_used BOOLEAN;
  v_email_hash TEXT;
BEGIN
  SELECT intro_price_used INTO v_intro_used
    FROM public.profiles WHERE id = OLD.id;

  v_email_hash := encode(digest(lower(OLD.email), 'sha256'), 'hex');

  INSERT INTO public.deleted_account_flags (email_hash, intro_used, flagged_at)
  VALUES (v_email_hash, COALESCE(v_intro_used, FALSE), now())
  ON CONFLICT (email_hash) DO UPDATE
    SET intro_used = deleted_account_flags.intro_used OR EXCLUDED.intro_used,
        flagged_at = now();

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_deleted();
