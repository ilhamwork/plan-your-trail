import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import {
  activateSubscription,
  beginGracePeriod,
  cancelSubscription,
  getActiveSubscription,
  restoreSoftDeletedRoutes,
} from '@/lib/subscription'

// ---------------------------------------------------------------------------
// POST /api/webhook/midtrans — Midtrans webhook handler
// Requirements: 8.7, 8.8, 8.11, 12.2, 12.7
// ---------------------------------------------------------------------------

interface MidtransNotification {
  order_id: string
  transaction_status: string
  fraud_status?: string
  transaction_id?: string
  signature_key?: string
  status_code?: string
  gross_amount?: string
  custom_field1?: string // carries the plan: 'monthly' | 'annual'
}

/**
 * Verify the Midtrans HMAC-SHA512 signature.
 * Formula: SHA512(order_id + status_code + gross_amount + SERVER_KEY)
 * Req 8.7, design: Webhook Handler section
 */
function verifySignature(notification: MidtransNotification, serverKey: string): boolean {
  const { order_id, status_code, gross_amount, signature_key } = notification

  if (!order_id || !status_code || !gross_amount || !signature_key) return false

  const rawString = `${order_id}${status_code}${gross_amount}${serverKey}`
  const expected = createHash('sha512').update(rawString).digest('hex')

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature_key.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature_key.charCodeAt(i)
  }
  return mismatch === 0
}

export async function POST(request: Request) {
  // Parse body
  let notification: MidtransNotification
  try {
    notification = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { order_id, transaction_status } = notification

  if (!order_id || !transaction_status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ---------------------------------------------------------------------------
  // 1. Verify HMAC-SHA512 signature (Req 8.7)
  // ---------------------------------------------------------------------------
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) {
    console.error('[webhook/midtrans] MIDTRANS_SERVER_KEY not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  if (!verifySignature(notification, serverKey)) {
    console.warn('[webhook/midtrans] Invalid signature for order_id:', order_id)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ---------------------------------------------------------------------------
  // 2. Resolve userId from order_id (format: pyt_<userId>_<timestamp>)
  // ---------------------------------------------------------------------------
  const orderParts = order_id.split('_')
  // order_id = pyt_{uuid}_{timestamp}  — uuid itself contains hyphens but no underscores
  // Safe to take slice [1, -1] joined back (but UUIDs have hyphens, not underscores)
  // The userId segment is everything between first and last underscore groups
  // format: pyt_<userId>_<timestamp>  → parts[1] is userId, parts[2] is timestamp
  const userId = orderParts.length >= 3 ? orderParts.slice(1, -1).join('_') : null

  if (!userId) {
    console.error('[webhook/midtrans] Cannot resolve userId from order_id:', order_id)
    return NextResponse.json({ error: 'Cannot resolve user from order_id' }, { status: 400 })
  }

  // ---------------------------------------------------------------------------
  // 3. Handle transaction_status (Req 8.7, 8.8, 8.11)
  // ---------------------------------------------------------------------------
  switch (transaction_status) {
    // -------------------------------------------------------------------------
    // capture / settlement — activate subscription
    // -------------------------------------------------------------------------
    case 'capture':
    case 'settlement': {
      // Only process payments that are not fraudulent (card capture)
      if (notification.fraud_status && notification.fraud_status !== 'accept') {
        console.warn('[webhook/midtrans] Fraud detected for order:', order_id)
        return NextResponse.json({ received: true })
      }

      // Resolve plan from custom_field1 (set during checkout) or default to 'monthly'
      const plan: 'monthly' | 'annual' =
        notification.custom_field1 === 'annual' ? 'annual' : 'monthly'

      try {
        // Atomic intro price check-and-set + subscription insert (Req 12.2, 12.7)
        // ON CONFLICT on midtrans_order_id ensures idempotency on duplicate delivery
        await activateSubscription(order_id, userId, plan, notification.transaction_id)

        // Restore soft-deleted routes within the 30-day window (Req 5.8, 10.5)
        await restoreSoftDeletedRoutes(userId)
      } catch (err) {
        console.error('[webhook/midtrans] settlement processing error:', err)
        // Return 500 so Midtrans retries delivery
        return NextResponse.json({ error: 'Subscription activation failed' }, { status: 500 })
      }

      break
    }

    // -------------------------------------------------------------------------
    // deny / expire — begin grace period + send dunning emails (Req 8.8, 9.1)
    // -------------------------------------------------------------------------
    case 'deny':
    case 'expire': {
      const sub = await getActiveSubscription(userId)
      if (sub && sub.status === 'active') {
        // beginGracePeriod also calls scheduleDunningEmails internally
        await beginGracePeriod(sub.id)
      }
      break
    }

    // -------------------------------------------------------------------------
    // cancel — cancel subscription; Pro access retained until period_end (Req 8.14)
    // -------------------------------------------------------------------------
    case 'cancel': {
      const sub = await getActiveSubscription(userId)
      if (sub) {
        await cancelSubscription(sub.id)
      }
      break
    }

    // -------------------------------------------------------------------------
    // pending — log only, no tier change
    // -------------------------------------------------------------------------
    case 'pending':
      // Intentional no-op — Midtrans will send a subsequent settled/denied event
      break

    default:
      // Unknown status — acknowledge without action
      break
  }

  return NextResponse.json({ received: true })
}
