import { NextResponse } from 'next/server'
import { resolveTier } from '@/lib/access-guard'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// POST /api/subscription/checkout — Midtrans Snap token creation
// Requirements: 1.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.12
// ---------------------------------------------------------------------------

const MIDTRANS_SNAP_URL =
  process.env.MIDTRANS_ENV === 'production'
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

export async function POST(request: Request) {
  // 1. Resolve tier — must be 'free' (current free user upgrading)
  let ctx
  try {
    ctx = await resolveTier()
  } catch (err) {
    // resolveTier throws a Response on 503
    if (err instanceof Response) return err
    return NextResponse.json(
      { error: { code: 'TIER_GUARD_UNAVAILABLE', message: 'Access guard unavailable' } },
      { status: 503 },
    )
  }

  if (ctx.tier !== 'free') {
    // Already Pro (or anonymous — anonymous can't subscribe without logging in)
    return NextResponse.json(
      {
        error: {
          code: 'TIER_INSUFFICIENT',
          message:
            ctx.tier === 'pro'
              ? 'You already have an active Pro subscription'
              : 'You must be logged in to subscribe',
          tier: ctx.tier,
        },
      },
      { status: 403 },
    )
  }

  const userId = ctx.userId!

  // 2. Check email_verified via admin client (bypasses RLS)
  const admin = createSupabaseAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('email, email_verified, intro_price_used')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' } },
      { status: 500 },
    )
  }

  // Req 1.6: block upgrade if email not verified
  if (!profile.email_verified) {
    return NextResponse.json(
      {
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address before upgrading to Pro',
        },
      },
      { status: 403 },
    )
  }

  // 3. Parse request body for plan
  let plan: 'monthly' | 'annual' = 'monthly'
  try {
    const body = await request.json()
    if (body?.plan === 'annual') plan = 'annual'
  } catch {
    // Default to monthly if body is missing/malformed
  }

  // 4. Determine gross_amount based on intro price eligibility
  //    Req 8.4: if intro_price_used = false → Rp 29.000
  //    Req 8.2/8.3: else monthly = Rp 49.000, annual = Rp 399.000
  const grossAmount: number = !profile.intro_price_used
    ? 29000
    : plan === 'annual'
      ? 399000
      : 49000

  // 5. Generate order_id
  const orderId = `pyt_${userId}_${Date.now()}`

  // 6. Build Midtrans Basic Auth header (SERVER_KEY + ':' base64-encoded)
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) {
    return NextResponse.json(
      { error: { code: 'PAYMENT_GATEWAY_ERROR', message: 'Payment gateway not configured' } },
      { status: 503 },
    )
  }

  const basicAuth = Buffer.from(`${serverKey}:`).toString('base64')

  const midtransBody = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    customer_details: {
      email: profile.email,
    },
    // Store plan in custom_field so webhook can read it
    custom_field1: plan,
    credit_card: {
      secure: true,
    },
  }

  // 7. POST to Midtrans Snap API
  let snapToken: string
  try {
    const midtransResponse = await fetch(MIDTRANS_SNAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(midtransBody),
    })

    if (!midtransResponse.ok) {
      const errBody = await midtransResponse.text()
      console.error('[checkout] Midtrans error response:', midtransResponse.status, errBody)
      // Req 8.12: on gateway error, return 503 without mutating subscription state
      return NextResponse.json(
        {
          error: {
            code: 'PAYMENT_GATEWAY_ERROR',
            message: 'Payment gateway is currently unavailable. Please try again later.',
          },
        },
        { status: 503 },
      )
    }

    const midtransData = await midtransResponse.json()
    snapToken = midtransData.token

    if (!snapToken) {
      console.error('[checkout] Midtrans did not return a token:', midtransData)
      return NextResponse.json(
        {
          error: {
            code: 'PAYMENT_GATEWAY_ERROR',
            message: 'Payment gateway returned an unexpected response.',
          },
        },
        { status: 503 },
      )
    }
  } catch (networkErr) {
    console.error('[checkout] Midtrans network error:', networkErr)
    // Req 8.12: network error → 503, never mutate subscription state
    return NextResponse.json(
      {
        error: {
          code: 'PAYMENT_GATEWAY_ERROR',
          message: 'Unable to reach payment gateway. Please try again later.',
        },
      },
      { status: 503 },
    )
  }

  // 8. Return snapToken and amount to client — DO NOT activate subscription here
  //    Subscription state is only mutated by the webhook handler (Task 8.3)
  return NextResponse.json({ snapToken, amount: grossAmount, orderId })
}
