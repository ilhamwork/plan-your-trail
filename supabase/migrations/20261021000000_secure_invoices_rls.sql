-- Enable Row Level Security on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Revoke direct access from public / anon / authenticated roles
-- All access to public.invoices now goes through Next.js Server Actions using SUPABASE_SERVICE_ROLE_KEY
REVOKE ALL ON TABLE public.invoices FROM anon, authenticated;

-- Drop any existing overly-permissive policies on public.invoices (adjust policy names if different in your project)
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
