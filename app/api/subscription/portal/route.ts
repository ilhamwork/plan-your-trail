import { NextResponse } from 'next/server'
import { resolveTier } from '@/lib/access-guard'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// GET /api/subscription/portal — subscription status + billing history
// Requirements: 8.14, 10.2
// ---------------------------------------------------------------------------

export async function GET() {
  // 1. Resolve tier — must be at least 'free' (any authenticated user)
  let ctx
  try {
    ctx = await resolveTier()
  } catch (err) {
    if (err instanceof Response) return err
    return NextResponse.json(
      { error: { code: 'TIER_GUARD_UNAVAILABLE', message: 'Access guard unavailable' } },
      { status: 503 },
    )
  }

  if (ctx.tier === 'anonymous' || ctx.userId === null) {
    return NextResponse.json(
      { error: { code: 'TIER_INSUFFICIENT', message: 'Authentication required', tier: ctx.tier } },
      { status: 403 },
    )
  }

  const admin = createSupabaseAdminClient()

  // 2. Fetch all subscriptions for this user ordered by created_at DESC
  const { data: subscriptions, error } = await admin
    .from('subscriptions')
    .select(
      'id, status, plan, current_period_start, current_period_end, amount_charged, introductory_applied, cancelled_at, grace_period_ends_at, created_at',
    )
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[subscription/portal] DB error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch subscription data' } },
      { status: 500 },
    )
  }

  // 3. Current subscription is the first one (most recent)
  const current = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null

  const subscription = current
    ? {
        status: current.status,
        plan: current.plan,
        current_period_end: current.current_period_end,
        amount_charged: current.amount_charged,
        introductory_applied: current.introductory_applied,
        cancelled_at: current.cancelled_at ?? null,
        grace_period_ends_at: current.grace_period_ends_at ?? null,
      }
    : null

  // 4. Billing history — all subscription rows (each represents a billing event)
  const billingHistory = (subscriptions ?? []).map((s) => ({
    id: s.id,
    plan: s.plan,
    amount_charged: s.amount_charged,
    introductory_applied: s.introductory_applied,
    status: s.status,
    current_period_start: s.current_period_start,
    current_period_end: s.current_period_end,
    created_at: s.created_at,
  }))

  return NextResponse.json({ subscription, billingHistory })
}
