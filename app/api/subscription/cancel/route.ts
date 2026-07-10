import { NextResponse } from 'next/server'
import { resolveTier } from '@/lib/access-guard'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// POST /api/subscription/cancel
// Requirements: 8.14, 10.2
// ---------------------------------------------------------------------------

export async function POST() {
  // 1. Resolve tier — must be 'pro' to cancel
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

  if (ctx.tier !== 'pro') {
    return NextResponse.json(
      {
        error: {
          code: 'TIER_INSUFFICIENT',
          message: 'No active Pro subscription to cancel',
          tier: ctx.tier,
        },
      },
      { status: 403 },
    )
  }

  if (!ctx.subscriptionId) {
    return NextResponse.json(
      { error: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'No active subscription found' } },
      { status: 404 },
    )
  }

  // 2. Set status='cancelled', cancelled_at=now()
  //    Do NOT set current_period_end — Pro access continues until that date (Req 8.14)
  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', ctx.subscriptionId)

  if (error) {
    console.error('[subscription/cancel] DB error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel subscription' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ cancelled: true })
}
