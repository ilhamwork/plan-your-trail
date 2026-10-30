-- ==============================================================================
-- PlanYourTrail - Complete Database Schema (PostgreSQL)
-- Core Stack: Drizzle ORM + Better Auth + Cloudflare R2 Storage
-- Maintained Services: Core App, Feedback, and Invoices
-- ==============================================================================
-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. BETTER AUTH TABLES (AGENTS.md Section 6 - UUID IDs)
-- ==============================================================================
-- User Accounts
CREATE TABLE IF NOT EXISTS "user" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN DEFAULT false NOT NULL,
    "image" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT "user_email_unique" UNIQUE ("email")
);

-- Active User Sessions
CREATE TABLE IF NOT EXISTS "session" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT "session_token_unique" UNIQUE ("token")
);

-- Authentication Providers (OAuth Google, Email/Password, etc.)
CREATE TABLE IF NOT EXISTS "account" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "access_token_expires_at" TIMESTAMP WITH TIME ZONE,
    "refresh_token_expires_at" TIMESTAMP WITH TIME ZONE,
    "scope" TEXT,
    "id_token" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Verification Tokens (Email Verification & Password Reset)
CREATE TABLE IF NOT EXISTS "verification" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==============================================================================
-- 3. CORE APPLICATION TABLES
-- ==============================================================================
-- User Profiles & Entitlement Tier ('free' | 'pro')
CREATE TABLE IF NOT EXISTS "profile" (
    "user_id" UUID PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
    "plan" TEXT DEFAULT 'free' NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Saved Routes (Original GPX stored in Cloudflare R2 / S3)
CREATE TABLE IF NOT EXISTS "route" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "track_simplified" JSONB NOT NULL,
    "gpx_object_key" TEXT NOT NULL,
    "hidden" BOOLEAN DEFAULT false NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Pro Feature Waitlist & Early Access
CREATE TABLE IF NOT EXISTS "waitlist" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "feature" TEXT NOT NULL,
    "survey" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Weather Forecast Cache per session
CREATE TABLE IF NOT EXISTS "weather_cache" (
    "key" TEXT PRIMARY KEY,
    "payload" JSONB NOT NULL,
    "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Database-backed Rate Limiter
CREATE TABLE IF NOT EXISTS "rate_limit" (
    "key" TEXT PRIMARY KEY,
    "window_start" TIMESTAMP WITH TIME ZONE NOT NULL,
    "count" INTEGER DEFAULT 1 NOT NULL
);

-- Daily Aggregated Analytics
CREATE TABLE IF NOT EXISTS "daily_analytics" (
    "date" DATE PRIMARY KEY,
    "metrics" JSONB DEFAULT '{}'::jsonb NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==============================================================================
-- 4. MAINTAINED AUXILIARY TABLES (Feedback & Invoice)
-- ==============================================================================
-- User Feedback (Submitted via Footer Modal)
CREATE TABLE IF NOT EXISTS "feedback" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "runner_name" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT "feedback_message_check" CHECK (char_length(trim(message)) > 0)
);

-- Internal Invoices (Used by /invoice admin routes)
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "invoice_number" TEXT NOT NULL UNIQUE,
    "invoice_date" DATE NOT NULL,
    "client_name" TEXT,
    "client_company" TEXT NOT NULL,
    "client_address" TEXT,
    "items" JSONB DEFAULT '[]'::jsonb NOT NULL,
    "tax_percentage" NUMERIC(5, 2) DEFAULT 0,
    "total_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==============================================================================
-- 5. INDEXES
-- ==============================================================================
-- Auth Indexes
CREATE INDEX IF NOT EXISTS "idx_session_user_id" ON "session" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_account_user_id" ON "account" ("user_id");

-- Route Indexes
CREATE INDEX IF NOT EXISTS "idx_route_user_hidden" ON "route" ("user_id", "hidden");

CREATE INDEX IF NOT EXISTS "idx_route_created_at" ON "route" ("created_at" DESC);

-- Waitlist & Cache Indexes
CREATE INDEX IF NOT EXISTS "idx_waitlist_user_id" ON "waitlist" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_weather_cache_expires" ON "weather_cache" ("expires_at");

CREATE INDEX IF NOT EXISTS "idx_rate_limit_window" ON "rate_limit" ("window_start");

-- Auxiliary Indexes
CREATE INDEX IF NOT EXISTS "idx_feedback_created_at" ON "feedback" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_invoices_created_at" ON "invoices" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_invoices_invoice_number" ON "invoices" ("invoice_number");

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL
-- ==============================================================================
-- Enable RLS on ALL tables
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "profile" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "route" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "waitlist" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "weather_cache" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "rate_limit" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "daily_analytics" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;

-- Invoices: Strictly accessible via Next.js Server Actions / owner role (revoke public & roles if present)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON TABLE "invoices" FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON TABLE "invoices" FROM authenticated';
    END IF;
    EXECUTE 'REVOKE ALL ON TABLE "invoices" FROM public';
END
$$;

-- Feedback: Allow anonymous & authenticated users to submit feedback
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'feedback' AND policyname = 'Allow public insert on feedback'
    ) THEN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            EXECUTE 'CREATE POLICY "Allow public insert on feedback" ON "feedback" FOR INSERT TO anon, authenticated WITH CHECK (char_length(trim(message)) > 0)';
        ELSE
            EXECUTE 'CREATE POLICY "Allow public insert on feedback" ON "feedback" FOR INSERT TO public WITH CHECK (char_length(trim(message)) > 0)';
        END IF;
    END IF;
END
$$;