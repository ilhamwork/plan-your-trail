-- ==============================================================================
-- PlanYourTrail - Reset Database Script (Development Environment Only)
-- Run this in the Supabase SQL Editor to drop all application tables & enums.
-- ==============================================================================

-- 1. DROP ALL APPLICATION TABLES
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.tool_feedback CASCADE;
DROP TABLE IF EXISTS public.user_routes CASCADE;
DROP TABLE IF EXISTS public.user_shares CASCADE;
DROP TABLE IF EXISTS public.shared_routes CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;

-- Drop draft or unused tables
DROP TABLE IF EXISTS public.daily_analytics CASCADE;
DROP TABLE IF EXISTS public.saved_routes CASCADE;
DROP TABLE IF EXISTS public.user_saved_routes CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. DROP CUSTOM ENUMS
DROP TYPE IF EXISTS public.route_access CASCADE;
DROP TYPE IF EXISTS public.subscription_plan CASCADE;
DROP TYPE IF EXISTS public.subscription_status CASCADE;
