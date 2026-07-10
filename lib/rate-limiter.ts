import { createSupabaseAdminClient } from './supabase-server'
import type { UserTier } from './access-guard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean
  count: number
  limit: number | typeof Infinity
  resetAt: Date
}

// ---------------------------------------------------------------------------
// Rate limit config (Req 6.1, 6.2, 6.3)
// ---------------------------------------------------------------------------

const TIER_LIMITS: Record<UserTier, number | typeof Infinity> = {
  anonymous: 10,
  free: 50,
  pro: Infinity,
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Checks whether the given identifier has exceeded its upload quota within the
 * rolling 24-hour window.
 *
 * Pro tier returns immediately without a DB query (Req 6.3).
 * Counts are rolling from the current timestamp — not calendar-day boundaries (Req 6.4).
 *
 * @param identifier   IP address (anonymous) or user UUID (free/pro)
 * @param identifierType  'ip' or 'user'
 * @param tier         Resolved tier of the current request
 */
export async function checkRateLimit(
  identifier: string,
  identifierType: 'ip' | 'user',
  tier: UserTier,
): Promise<RateLimitResult> {
  const limit = TIER_LIMITS[tier]

  // Pro users are never rate-limited — no DB query needed (Req 6.3)
  if (limit === Infinity) {
    return { allowed: true, count: 0, limit: Infinity, resetAt: new Date() }
  }

  const supabase = createSupabaseAdminClient()

  // Rolling 24-hour window start (Req 6.4)
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('rate_limit_windows')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('identifier_type', identifierType)
    .gt('window_start', windowStart)

  const currentCount = count ?? 0

  return {
    allowed: currentCount < (limit as number),
    count: currentCount,
    limit,
    // Reset time is 24h from now (approximation; actual window is rolling per-upload)
    resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }
}

/**
 * Records a single upload event for rate-limit tracking.
 * Should only be called after checkRateLimit confirms the upload is allowed —
 * blocked uploads must NOT increment the counter (Req 6.6, 6.7).
 *
 * @param identifier   IP address or user UUID
 * @param identifierType  'ip' or 'user'
 */
export async function recordUpload(
  identifier: string,
  identifierType: 'ip' | 'user',
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  await supabase.from('rate_limit_windows').insert({
    identifier,
    identifier_type: identifierType,
    window_start: new Date().toISOString(),
    count: 1,
  })
}
