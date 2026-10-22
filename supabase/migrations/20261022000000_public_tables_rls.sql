-- Ensure Row Level Security is enabled on all public telemetry, feedback, and shared route tables
ALTER TABLE IF EXISTS public.user_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shared_routes ENABLE ROW LEVEL SECURITY;

-- 1. Telemetry & Feedback tables: allow INSERT for anon/authenticated, block SELECT/UPDATE/DELETE for anon
DO $$
BEGIN
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

  -- 2. Shared routes: allow public read by ID
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
END
$$;
