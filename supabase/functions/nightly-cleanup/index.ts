/**
 * Supabase Edge Function: nightly-cleanup
 *
 * Scheduled via pg_cron to run nightly at 02:00 UTC.
 * Performs two cleanup operations:
 *   1. Permanently deletes saved_routes rows where deleted_at < now() - 30 days  (Req 5.7)
 *   2. Prunes rate_limit_windows rows older than 25 hours to keep the table bounded (Req 6.4)
 *
 * Requirements: 5.7, 6.4
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  // Only accept POST (pg_cron / HTTP scheduler sends POST)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const results: Record<string, unknown> = {}
  const errors: string[] = []

  // ------------------------------------------------------------------
  // 1. Permanently delete soft-deleted routes past the 30-day window
  //    Requirement 5.7
  // ------------------------------------------------------------------
  try {
    const { error: routesError, count: deletedRoutes } = await supabase
      .from('saved_routes')
      .delete({ count: 'exact' })
      .not('deleted_at', 'is', null)
      .lt('deleted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (routesError) {
      errors.push(`saved_routes cleanup failed: ${routesError.message}`)
    } else {
      results.deletedRoutes = deletedRoutes ?? 0
    }
  } catch (err) {
    errors.push(`saved_routes cleanup exception: ${String(err)}`)
  }

  // ------------------------------------------------------------------
  // 2. Prune rate_limit_windows older than 25 hours
  //    Requirement 6.4
  // ------------------------------------------------------------------
  try {
    const { error: rlError, count: deletedWindows } = await supabase
      .from('rate_limit_windows')
      .delete({ count: 'exact' })
      .lt('window_start', new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString())

    if (rlError) {
      errors.push(`rate_limit_windows cleanup failed: ${rlError.message}`)
    } else {
      results.deletedRateLimitWindows = deletedWindows ?? 0
    }
  } catch (err) {
    errors.push(`rate_limit_windows cleanup exception: ${String(err)}`)
  }

  // ------------------------------------------------------------------
  // Response
  // ------------------------------------------------------------------
  const hasErrors = errors.length > 0
  const status = hasErrors ? 500 : 200

  const body = {
    success: !hasErrors,
    results,
    ...(hasErrors ? { errors } : {}),
    ranAt: new Date().toISOString(),
  }

  console.log('[nightly-cleanup]', JSON.stringify(body))

  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
})
