import { createSupabaseAdminClient } from './supabase-server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Subscription {
  id: string
  user_id: string
  midtrans_order_id: string
  midtrans_transaction_id: string | null
  plan: 'monthly' | 'annual'
  status: 'active' | 'grace_period' | 'cancelled' | 'expired'
  amount_charged: number
  introductory_applied: boolean
  current_period_start: string
  current_period_end: string
  grace_period_ends_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface ApplyIntroductoryPriceResult {
  subscriptionId: string
  introductoryApplied: boolean
}

// ---------------------------------------------------------------------------
// Task 3.1 — Subscription lifecycle helpers
// ---------------------------------------------------------------------------

/**
 * Returns the most recent active, grace_period, or cancelled subscription for
 * the given user, or null if none exists.
 *
 * Requirements: 8.8, 8.9, 8.10, 8.14
 */
export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'grace_period', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data as Subscription
}

/**
 * Transitions a subscription into the grace_period state, setting the
 * grace_period_ends_at to 3 days from now.
 *
 * Requirements: 8.8, 8.9, 10.1
 */
export async function beginGracePeriod(subscriptionId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const gracePeriodEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

  await supabase
    .from('subscriptions')
    .update({
      status: 'grace_period',
      grace_period_ends_at: gracePeriodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)

  // Schedule dunning emails now that grace period is set (Req 9.1)
  await scheduleDunningEmails(subscriptionId, gracePeriodEnd)
}

// ---------------------------------------------------------------------------
// Task 8.3 — activateSubscription (called from webhook handler)
// ---------------------------------------------------------------------------

/**
 * Activates a Pro subscription using the atomic intro price CTE.
 * Delegates to `applyIntroductoryPrice` which calls the
 * `activate_subscription_with_intro` Postgres RPC.
 *
 * This is a thin wrapper that makes the webhook handler code cleaner and
 * keeps `applyIntroductoryPrice` as the single source of truth for the
 * atomic CTE logic.
 *
 * Requirements: 8.7, 12.2, 12.7
 */
export async function activateSubscription(
  orderId: string,
  userId: string,
  plan: 'monthly' | 'annual',
  transactionId?: string,
): Promise<ApplyIntroductoryPriceResult> {
  return applyIntroductoryPrice(userId, plan, orderId, transactionId)
}

/**
 * Expires a grace period subscription (sets status to 'expired') and then
 * downgrades the associated user to the Free tier.
 *
 * Requirements: 8.10, 10.1, 10.3
 */
export async function expireGracePeriod(subscriptionId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()

  // Fetch user_id before updating so we can downgrade their routes
  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('id', subscriptionId)
    .single()

  if (error || !sub) return

  await supabase
    .from('subscriptions')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)

  await downgradeUserToFree(sub.user_id as string)
}

/**
 * Cancels a subscription immediately. Pro access is retained until the
 * current_period_end is reached (enforced by resolveTier in access-guard.ts).
 *
 * Requirements: 8.14
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()

  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
}

/**
 * Marks all saved routes beyond the 3 most recently created as read_only.
 * Routes are ranked by created_at DESC; the first 3 keep their current
 * access_level; the remainder are set to 'read_only'.
 *
 * Requirements: 5.10, 5.11, 10.1
 */
export async function downgradeUserToFree(userId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()

  // Fetch all active (non-deleted) routes ordered by most recent first
  const { data: routes, error } = await supabase
    .from('saved_routes')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error || !routes || routes.length <= 3) return

  // Skip first 3 — downgrade the rest
  const idsToDowngrade = routes.slice(3).map((r: { id: string }) => r.id)

  if (idsToDowngrade.length === 0) return

  await supabase
    .from('saved_routes')
    .update({
      access_level: 'read_only',
      updated_at: new Date().toISOString(),
    })
    .in('id', idsToDowngrade)
}

/**
 * Restores soft-deleted routes (deleted within the last 30 days) to active
 * state and resets their access_level to 'read_write'.
 *
 * Called when a Free user re-upgrades to Pro.
 *
 * Requirements: 5.8
 */
export async function restoreSoftDeletedRoutes(userId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('saved_routes')
    .update({
      deleted_at: null,
      access_level: 'read_write',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .gt('deleted_at', thirtyDaysAgo)
}

// ---------------------------------------------------------------------------
// Task 3.2 — applyIntroductoryPrice (atomic CTE check-and-set via RPC)
// ---------------------------------------------------------------------------

/**
 * Atomically applies the introductory price (if eligible) and activates a Pro
 * subscription by calling the `activate_subscription_with_intro` Postgres
 * function via Supabase RPC.
 *
 * This function MUST NOT be implemented as two separate queries — the
 * atomicity guarantee (Req 12.7) requires a single database round-trip that
 * both checks-and-sets `profiles.intro_price_used` AND inserts the
 * subscription row within the same transaction.
 *
 * The RPC must be created in your Supabase project once, using the SQL below.
 *
 * @param userId       - UUID of the user being subscribed
 * @param plan         - 'monthly' | 'annual'
 * @param orderId      - Midtrans order ID (e.g. `pyt_<userId>_<timestamp>`)
 * @param transactionId - Optional Midtrans transaction ID from the webhook
 *
 * @returns `{ subscriptionId, introductoryApplied }`
 *   - `introductoryApplied = true`  → charged Rp 29.000
 *   - `introductoryApplied = false` → charged Rp 49.000 (monthly) or Rp 399.000 (annual)
 *
 * Requirements: 8.4, 8.6, 12.1, 12.2, 12.3, 12.7
 *
 * ---
 *
 * SQL to create the required RPC in Supabase (run once in the SQL editor or
 * as a migration):
 *
 * ```sql
 * CREATE OR REPLACE FUNCTION public.activate_subscription_with_intro(
 *   p_user_id UUID,
 *   p_order_id TEXT,
 *   p_plan TEXT,
 *   p_transaction_id TEXT DEFAULT NULL
 * )
 * RETURNS TABLE(subscription_id UUID, introductory_applied BOOLEAN)
 * LANGUAGE plpgsql SECURITY DEFINER AS $$
 * DECLARE
 *   v_intro_applied BOOLEAN := FALSE;
 *   v_amount INTEGER;
 *   v_period_end TIMESTAMPTZ;
 *   v_sub_id UUID;
 * BEGIN
 *   -- Atomic claim of intro price
 *   UPDATE public.profiles
 *   SET intro_price_used = TRUE, intro_price_used_at = now()
 *   WHERE id = p_user_id AND intro_price_used = FALSE;
 *
 *   GET DIAGNOSTICS v_intro_applied = (ROW_COUNT > 0);
 *
 *   -- Determine amount and period
 *   IF v_intro_applied THEN
 *     v_amount := 29000;
 *     v_period_end := now() + INTERVAL '30 days';
 *   ELSIF p_plan = 'annual' THEN
 *     v_amount := 399000;
 *     v_period_end := now() + INTERVAL '365 days';
 *   ELSE
 *     v_amount := 49000;
 *     v_period_end := now() + INTERVAL '30 days';
 *   END IF;
 *
 *   -- Insert subscription (idempotent: ON CONFLICT updates transaction id)
 *   INSERT INTO public.subscriptions (
 *     user_id, midtrans_order_id, midtrans_transaction_id, plan, status,
 *     amount_charged, introductory_applied, current_period_start, current_period_end
 *   ) VALUES (
 *     p_user_id, p_order_id, p_transaction_id, p_plan::subscription_plan, 'active',
 *     v_amount, v_intro_applied, now(), v_period_end
 *   )
 *   ON CONFLICT (midtrans_order_id) DO UPDATE
 *     SET midtrans_transaction_id = EXCLUDED.midtrans_transaction_id,
 *         updated_at = now()
 *   RETURNING id INTO v_sub_id;
 *
 *   RETURN QUERY SELECT v_sub_id, v_intro_applied;
 * END;
 * $$;
 * ```
 */
export async function applyIntroductoryPrice(
  userId: string,
  plan: 'monthly' | 'annual',
  orderId: string,
  transactionId?: string,
): Promise<ApplyIntroductoryPriceResult> {
  // NOTE: The Supabase JS client does not support raw multi-statement CTEs
  // directly in .from(). Instead we call a SECURITY DEFINER Postgres function
  // via .rpc() so the check-and-set + INSERT happen atomically in one
  // server-side transaction (satisfies Req 12.7).
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase.rpc('activate_subscription_with_intro', {
    p_user_id: userId,
    p_order_id: orderId,
    p_plan: plan,
    p_transaction_id: transactionId ?? null,
  })

  if (error) {
    throw new Error(`activate_subscription_with_intro RPC failed: ${error.message}`)
  }

  // The RPC returns a single-row table: [{ subscription_id, introductory_applied }]
  const row = Array.isArray(data) ? data[0] : data

  if (!row || !row.subscription_id) {
    throw new Error('activate_subscription_with_intro returned no subscription ID')
  }

  return {
    subscriptionId: row.subscription_id as string,
    introductoryApplied: row.introductory_applied as boolean,
  }
}

// ---------------------------------------------------------------------------
// Task 8.5 — Dunning email scheduling
// Requirements: 9.1, 9.5
// ---------------------------------------------------------------------------

/**
 * Sends dunning emails for a subscription entering grace period.
 *
 * - First email: sent immediately at grace period start
 * - Second email: scheduled for gracePeriodEnd - 24 hours (logged to dunning_log
 *   with delivery_status='scheduled' since Next.js has no persistent job queue)
 *
 * On any delivery failure the record is logged with delivery_status='failed'.
 * The in-app GracePeriodBanner is the fallback notification channel (Req 9.5).
 *
 * Requirements: 9.1, 9.5
 */
export async function scheduleDunningEmails(
  subscriptionId: string,
  gracePeriodEnd: Date,
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  // Fetch subscription + user info to get email
  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('user_id, grace_period_ends_at')
    .eq('id', subscriptionId)
    .single()

  if (subError || !sub) {
    console.error('[dunning] Failed to fetch subscription:', subError)
    return
  }

  const userId = sub.user_id as string

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, email_verified')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error('[dunning] Failed to fetch user profile:', profileError)
    return
  }

  const now = new Date()
  const gracePeriodMs = gracePeriodEnd.getTime() - now.getTime()
  const daysRemainingStart = Math.ceil(gracePeriodMs / (1000 * 60 * 60 * 24))

  // ---------------------------------------------------------------------------
  // Email 1: Send immediately at grace period start
  // ---------------------------------------------------------------------------
  await sendDunningEmail({
    userId,
    subscriptionId,
    emailType: 'grace_period_start',
    email: profile.email as string,
    daysRemaining: daysRemainingStart,
    gracePeriodEnd,
    supabase,
  })

  // ---------------------------------------------------------------------------
  // Email 2: Schedule for gracePeriodEnd - 24 hours
  // Since Next.js has no persistent job queue, we log to dunning_log with
  // delivery_status='scheduled' and a scheduled_for timestamp.
  // A background worker or Edge Function can poll this table to send at the
  // right time. (Req 9.1)
  // ---------------------------------------------------------------------------
  const secondEmailScheduledFor = new Date(gracePeriodEnd.getTime() - 24 * 60 * 60 * 1000)
  const daysRemainingSecond = 1 // day-before email always shows 1 day remaining

  // If the second email time is already in the past (short grace period), send now
  if (secondEmailScheduledFor <= now) {
    await sendDunningEmail({
      userId,
      subscriptionId,
      emailType: 'grace_period_day_before',
      email: profile.email as string,
      daysRemaining: daysRemainingSecond,
      gracePeriodEnd,
      supabase,
    })
  } else {
    // Log as scheduled — a cron job / Edge Function should pick this up.
    // The sent_at is set to the intended send time so a polling job knows when to fire.
    try {
      await supabase.from('dunning_log').insert({
        user_id: userId,
        subscription_id: subscriptionId,
        email_type: 'grace_period_day_before',
        delivery_status: 'scheduled',
        // sent_at stores the intended delivery time (column default is now(), so we
        // override it with the future timestamp for the day-before email)
        sent_at: secondEmailScheduledFor.toISOString(),
      })
    } catch (err) {
      console.error('[dunning] Failed to schedule day-before email:', err)
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helper — send a single dunning email and write to dunning_log
// ---------------------------------------------------------------------------

interface DunningEmailParams {
  userId: string
  subscriptionId: string
  emailType: 'grace_period_start' | 'grace_period_day_before'
  email: string
  daysRemaining: number
  gracePeriodEnd: Date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createSupabaseAdminClient>
}

async function sendDunningEmail({
  userId,
  subscriptionId,
  emailType,
  email,
  daysRemaining,
  gracePeriodEnd,
  supabase,
}: DunningEmailParams): Promise<void> {
  const subject =
    emailType === 'grace_period_start'
      ? `Action required: Your PlanYourTrail Pro payment failed — ${daysRemainingLabel(daysRemaining)} remaining`
      : `Final reminder: Your PlanYourTrail Pro access ends tomorrow`

  const body = buildDunningEmailBody(emailType, daysRemaining, gracePeriodEnd)

  let deliveryStatus: 'sent' | 'failed' = 'failed'

  try {
    // Attempt to send via Supabase Auth admin email
    // NOTE: supabase.auth.admin.sendRawEmail is available in some Supabase versions.
    // If not available, the delivery_status will be 'failed' and the in-app banner
    // serves as the fallback (Req 9.5).
    const authAdmin = supabase.auth.admin
    if (
      authAdmin &&
      typeof (authAdmin as unknown as Record<string, unknown>).sendRawEmail === 'function'
    ) {
      const sendFn = (authAdmin as unknown as Record<string, unknown>).sendRawEmail as (
        params: Record<string, string>,
      ) => Promise<{ error: unknown }>
      const { error } = await sendFn({ to: email, subject, html: body })
      if (!error) {
        deliveryStatus = 'sent'
      } else {
        console.error('[dunning] sendRawEmail error:', error)
      }
    } else {
      // sendRawEmail not available — log as failed; in-app banner is fallback
      console.warn(
        '[dunning] supabase.auth.admin.sendRawEmail not available. Logging as failed; in-app banner will serve as fallback.',
      )
    }
  } catch (err) {
    console.error('[dunning] Email send threw an exception:', err)
    deliveryStatus = 'failed'
  }

  // Write to dunning_log regardless of delivery outcome (Req 9.5)
  try {
    await supabase.from('dunning_log').insert({
      user_id: userId,
      subscription_id: subscriptionId,
      email_type: emailType,
      delivery_status: deliveryStatus,
      sent_at: new Date().toISOString(),
    })
  } catch (logErr) {
    console.error('[dunning] Failed to write to dunning_log:', logErr)
  }
}

function daysRemainingLabel(days: number): string {
  if (days <= 0) return '0 days'
  if (days === 1) return '1 day'
  return `${days} days`
}

function buildDunningEmailBody(
  emailType: 'grace_period_start' | 'grace_period_day_before',
  daysRemaining: number,
  gracePeriodEnd: Date,
): string {
  const expiryDateStr = gracePeriodEnd.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (emailType === 'grace_period_start') {
    return `
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a1a;">Payment Failed — Action Required</h2>
  <p>Hi there,</p>
  <p>We were unable to process your PlanYourTrail Pro subscription payment. Your Pro access is still active during a <strong>grace period of ${daysRemainingLabel(daysRemaining)}</strong>.</p>
  <p>Your grace period ends on <strong>${expiryDateStr}</strong>. After that, your account will revert to the Free tier.</p>
  <p>To keep your Pro access, please update your payment method:</p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://planyourtrail.run'}/account" 
       style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
      Update Payment Method
    </a>
  </p>
  <p>If you have any questions, please reply to this email.</p>
  <p>— The PlanYourTrail Team</p>
</body>
</html>
    `.trim()
  }

  // day-before email
  return `
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #dc2626;">Final Reminder — Pro Access Ends Tomorrow</h2>
  <p>Hi there,</p>
  <p>This is a final reminder that your PlanYourTrail Pro grace period ends <strong>tomorrow (${expiryDateStr})</strong>.</p>
  <p>You have <strong>${daysRemainingLabel(daysRemaining)} remaining</strong> to update your payment method before your account reverts to the Free tier.</p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://planyourtrail.run'}/account" 
       style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
      Update Payment Method Now
    </a>
  </p>
  <p>If you have already updated your payment, please ignore this email.</p>
  <p>— The PlanYourTrail Team</p>
</body>
</html>
  `.trim()
}
