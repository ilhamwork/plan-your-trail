-- ==============================================================================
-- PlanYourTrail - Complete Database Schema (Development / Staging / Production)
-- Run this script in the Supabase SQL Editor on a fresh project or via CLI.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'route_access') THEN
    CREATE TYPE public.route_access AS ENUM ('read_write', 'read_only');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
    CREATE TYPE public.subscription_plan AS ENUM ('monthly', 'annual');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE public.subscription_status AS ENUM ('active', 'grace_period', 'cancelled', 'expired');
  END IF;
END
$$;

-- 3. TABLES

-- 3.1 Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text,
  email text,
  message text NOT NULL,
  runner_name text,
  CONSTRAINT feedback_message_check CHECK (char_length(trim(message)) > 0)
);

-- 3.2 Tool Feedback Table
CREATE TABLE IF NOT EXISTS public.tool_feedback (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  rating text NOT NULL,
  name text
);

-- 3.3 User Routes Table (Telemetry on GPX load)
CREATE TABLE IF NOT EXISTS public.user_routes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_name text,
  race_name text,
  race_date text,
  file_name text,
  distance double precision,
  elevation_gain double precision
);

-- 3.4 User Shares Table (Telemetry on Share / Download)
CREATE TABLE IF NOT EXISTS public.user_shares (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_name text,
  race_name text,
  race_date text,
  share_type text,
  distance double precision,
  elevation_gain double precision
);

-- 3.5 Shared Routes Table (Shared GPX analysis & metadata)
CREATE TABLE IF NOT EXISTS public.shared_routes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  route_data jsonb NOT NULL,
  race_name text,
  user_name text,
  race_date text
);

-- 3.6 Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  invoice_date date NOT NULL,
  client_name text,
  client_company text NOT NULL,
  client_address text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax_percentage numeric(5, 2) DEFAULT 0,
  total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_feedback_created_at ON public.tool_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_routes_created_at ON public.user_routes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_shares_created_at ON public.user_shares (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_routes_created_at ON public.shared_routes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices (invoice_number);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 6. PERMISSIONS & POLICIES

-- Invoices: Strictly accessible via Next.js Server Actions with SUPABASE_SERVICE_ROLE_KEY
REVOKE ALL ON TABLE public.invoices FROM anon, authenticated;

-- Clear any existing policies on invoices
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoices'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoices', pol.policyname);
  END LOOP;
END
$$;

-- Public tables policies
DO $$
BEGIN
  -- Feedback: Allow public insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'feedback' AND policyname = 'Allow public insert on feedback'
  ) THEN
    CREATE POLICY "Allow public insert on feedback"
      ON public.feedback
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (char_length(trim(message)) > 0);
  END IF;

  -- Tool Feedback: Allow public insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tool_feedback' AND policyname = 'Allow public insert on tool_feedback'
  ) THEN
    CREATE POLICY "Allow public insert on tool_feedback"
      ON public.tool_feedback
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;

  -- User Routes: Allow public insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_routes' AND policyname = 'Allow public insert on user_routes'
  ) THEN
    CREATE POLICY "Allow public insert on user_routes"
      ON public.user_routes
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;

  -- User Shares: Allow public insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_shares' AND policyname = 'Allow public insert on user_shares'
  ) THEN
    CREATE POLICY "Allow public insert on user_shares"
      ON public.user_shares
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;

  -- Shared Routes: Allow public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shared_routes' AND policyname = 'Allow public read on shared_routes'
  ) THEN
    CREATE POLICY "Allow public read on shared_routes"
      ON public.shared_routes
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  -- Shared Routes: Allow public insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shared_routes' AND policyname = 'Allow public insert on shared_routes'
  ) THEN
    CREATE POLICY "Allow public insert on shared_routes"
      ON public.shared_routes
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END
$$;
