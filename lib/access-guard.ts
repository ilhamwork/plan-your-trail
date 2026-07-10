import { createSupabaseAdminClient, createSupabaseServerClient } from './supabase-server'
import { downgradeUserToFree } from './subscription'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserTier = 'anonymous' | 'free' | 'pro'

export interface TierContext {
  tier: UserTier
  userId: string | null
  subscriptionId: string | null
  gracePeriodEndsAt: Date | null
}

/**
 * Named Pro-only features used in requireFeature().
 * Each maps to a minimum tier of 'pro'.
 */
export type ProFeature =
  | 'waypoints'
  | 'weather'
  | 'weather_hourly'
  | 'pace_estimator'
  | 'pdf_export'
  | 'share_links'
  | 'route_compare'
  | 'notes'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Lazily expires a grace-period subscription when the deadline has passed.
 * Updates status to 'expired' and clears grace_period_ends_at.
 * Uses the admin client so it bypasses RLS.
 * (Req 2.4)
 */
async function expireGracePeriod(subscriptionId: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  await admin
    .from('subscriptions')
    .update({
      status: 'expired',
      grace_period_ends_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
}

// ---------------------------------------------------------------------------
// Tier resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the current user's tier from the session cookie and subscription state.
 *
 * Resolution chain (Req 2.1–2.10):
 *   - Unauthenticated                            → 'anonymous'
 *   - Authenticated, no active/grace/cancelled sub → 'free'
 *   - grace_period with expired deadline         → lazy-expire + 'free'
 *   - cancelled past current_period_end          → 'free'
 *   - active | grace_period (valid) | cancelled (within period) → 'pro'
 *
 * Throws a 503 Response on any database/auth error (Req 2.8).
 */
export async function resolveTier(): Promise<TierContext> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // Unauthenticated → anonymous (Req 2.6)
    if (error || !user) {
      return { tier: 'anonymous', userId: null, subscriptionId: null, gracePeriodEndsAt: null }
    }

    // Look up the most recent relevant subscription (Req 2.2, 2.3, 2.9)
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, status, current_period_end, grace_period_ends_at')
      .eq('user_id', user.id)
      .in('status', ['active', 'grace_period', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // No active/grace/cancelled subscription → free (Req 2.5)
    if (!sub) {
      return { tier: 'free', userId: user.id, subscriptionId: null, gracePeriodEndsAt: null }
    }

    const now = new Date()

    // Grace period expired → lazy expire + free (Req 2.4)
    if (sub.status === 'grace_period' && new Date(sub.grace_period_ends_at) < now) {
      await expireGracePeriod(sub.id)
      return { tier: 'free', userId: user.id, subscriptionId: sub.id, gracePeriodEndsAt: null }
    }

    // Cancelled past billing period → lazy downgrade + free (Req 2.9, 8.14, 10.1)
    if (sub.status === 'cancelled' && new Date(sub.current_period_end) < now) {
      // Lazy downgrade: mark excess routes as read-only now that the period has ended
      await downgradeUserToFree(user.id)
      return { tier: 'free', userId: user.id, subscriptionId: sub.id, gracePeriodEndsAt: null }
    }

    // Active, grace period (valid), or cancelled within period → pro (Req 2.2, 2.3, 2.9)
    if (
      sub.status === 'active' ||
      sub.status === 'grace_period' ||
      (sub.status === 'cancelled' && new Date(sub.current_period_end) >= now)
    ) {
      return {
        tier: 'pro',
        userId: user.id,
        subscriptionId: sub.id,
        gracePeriodEndsAt: sub.grace_period_ends_at ? new Date(sub.grace_period_ends_at) : null,
      }
    }

    // Fallback → free
    return { tier: 'free', userId: user.id, subscriptionId: null, gracePeriodEndsAt: null }
  } catch {
    // Req 2.8: indeterminate result → 503
    throw new Response(
      JSON.stringify({
        error: { code: 'TIER_GUARD_UNAVAILABLE', message: 'Access guard unavailable' },
      }),
      { status: 503 },
    )
  }
}

// ---------------------------------------------------------------------------
// Tier enforcement
// ---------------------------------------------------------------------------

/**
 * Asserts that ctx.tier meets the minimum required tier.
 * Throws a 403 Response if not (Req 3.11).
 */
export function requireTier(ctx: TierContext, minimum: 'free' | 'pro'): void {
  const rank: Record<UserTier, number> = { anonymous: 0, free: 1, pro: 2 }
  if (rank[ctx.tier] < rank[minimum]) {
    throw new Response(
      JSON.stringify({
        error: {
          code: 'TIER_INSUFFICIENT',
          message: 'Pro subscription required',
          tier: ctx.tier,
        },
      }),
      { status: 403 },
    )
  }
}

/**
 * Asserts that ctx.tier has access to the named Pro feature.
 * All ProFeature values currently require the 'pro' tier.
 * Throws a 403 Response if not (Req 3.1–3.9, 3.11).
 */
export function requireFeature(ctx: TierContext, feature: ProFeature): void {
  // All named features require Pro — the mapping is explicit for forward extensibility
  const featureTierMap: Record<ProFeature, 'free' | 'pro'> = {
    waypoints: 'pro',
    weather: 'free',
    weather_hourly: 'free',
    pace_estimator: 'pro',
    pdf_export: 'pro',
    share_links: 'pro',
    route_compare: 'pro',
    notes: 'pro',
  }

  requireTier(ctx, featureTierMap[feature])
}
