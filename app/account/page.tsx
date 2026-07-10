import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CreditCard, Calendar, Package, AlertTriangle } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-server"
import { resolveTier } from "@/lib/access-guard"
import { CancelSubscriptionButton } from "@/components/pro/CancelSubscriptionButton"
import type { SavedRoute } from "@/components/routes/RouteList"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubscriptionData {
  status: string
  plan: string
  current_period_end: string
  amount_charged: number
  introductory_applied: boolean
  cancelled_at: string | null
  grace_period_ends_at: string | null
}

interface BillingEntry {
  id: string
  plan: string
  amount_charged: number
  introductory_applied: boolean
  status: string
  current_period_start: string
  current_period_end: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function statusLabel(status: string): { label: string; className: string } {
  switch (status) {
    case "active":
      return { label: "Active", className: "bg-green-100 text-green-700" }
    case "grace_period":
      return { label: "Grace Period", className: "bg-amber-100 text-amber-700" }
    case "cancelled":
      return { label: "Cancelled", className: "bg-gray-100 text-gray-600" }
    case "expired":
      return { label: "Expired", className: "bg-red-100 text-red-600" }
    default:
      return { label: status, className: "bg-gray-100 text-gray-600" }
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata = {
  title: "My Account — PlanYourTrail",
  description: "Manage your subscription and saved routes.",
}

// ---------------------------------------------------------------------------
// Page — protected server component
// Requirements: 8.14, 9.2, 10.2
// ---------------------------------------------------------------------------

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; pending?: string }>
}) {
  const resolvedParams = await searchParams

  // 1. Redirect unauthenticated users (Req 13.2)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirectAfter=/account")
  }

  // 2. Resolve tier to get grace period info
  let ctx
  try {
    ctx = await resolveTier()
  } catch {
    redirect("/auth/login?redirectAfter=/account")
  }

  const admin = createSupabaseAdminClient()

  // 3. Fetch subscription data
  const [subscriptionsResult, routesResult, profileResult] = await Promise.all([
    admin
      .from("subscriptions")
      .select(
        "id, status, plan, current_period_start, current_period_end, amount_charged, introductory_applied, cancelled_at, grace_period_ends_at, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_routes")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("display_name, email, email_verified").eq("id", user.id).single(),
  ])

  const subscriptions = subscriptionsResult.data ?? []
  const routes = (routesResult.data ?? []) as SavedRoute[]
  const profile = profileResult.data

  const currentSub = subscriptions.length > 0 ? subscriptions[0] : null
  const billingHistory: BillingEntry[] = subscriptions

  const isPro = ctx?.tier === "pro"
  const isGrace = currentSub?.status === "grace_period"

  return (
    <div className="min-h-screen bg-[#FAF6F1]">
      {/* Grace period banner — sticky at top (Req 9.2) */}
      {isGrace && (
        <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-2.5">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="flex-1 text-xs font-medium text-amber-900">
              ⚠️ Your Pro subscription payment failed. Update your payment method to
              keep Pro access.{" "}
              <span className="font-bold">
                Grace period ends {formatDate(currentSub?.grace_period_ends_at ?? null)}.
              </span>
            </p>
          </div>
        </div>
      )}

        {/* Upgrade / pending banners */}
        {resolvedParams.upgraded === "1" && (
          <div className="border-b border-green-200 bg-green-50 px-4 py-2.5">
            <p className="text-center text-sm font-semibold text-green-700">
              🎉 Welcome to Pro! Your subscription is now active.
            </p>
          </div>
        )}
        {resolvedParams.pending === "1" && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5">
            <p className="text-center text-sm font-semibold text-amber-700">
              ⏳ Payment pending. Your Pro access will activate once confirmed.
            </p>
          </div>
        )}

        {/* Header */}
        <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold text-[#1B4332] transition hover:text-[#1B4332]/70"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to app
            </Link>
            <span className="text-sm font-bold text-[#2D3436]">My Account</span>
            <Link
              href="/pricing"
              className="text-sm font-medium text-[#E76F51] transition hover:text-[#E76F51]/80"
            >
              Pricing
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
          {/* Profile */}
          <section>
            <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1B4332] text-sm font-bold text-white">
                  {(profile?.display_name ?? profile?.email ?? "U")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#2D3436]">
                    {profile?.display_name ?? profile?.email ?? user.email}
                  </p>
                  <p className="text-xs text-gray-400">{profile?.email ?? user.email}</p>
                </div>
                {isPro && (
                  <span className="ml-auto inline-flex items-center rounded-full bg-[#E76F51]/10 px-2.5 py-1 text-[11px] font-bold text-[#E76F51]">
                    Pro
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Subscription card */}
          <section>
            <h2 className="mb-3 text-base font-bold text-[#2D3436]">Subscription</h2>

            {currentSub ? (
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-5 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Status */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-[#1B4332]/5 p-2">
                      <Package className="h-4 w-4 text-[#1B4332]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Status
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${statusLabel(currentSub.status).className}`}
                        >
                          {statusLabel(currentSub.status).label}
                        </span>
                        <span className="text-xs capitalize text-gray-500">
                          {currentSub.plan} plan
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Next billing / period end */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-[#1B4332]/5 p-2">
                      <Calendar className="h-4 w-4 text-[#1B4332]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        {currentSub.status === "cancelled"
                          ? "Access until"
                          : currentSub.status === "grace_period"
                            ? "Grace period ends"
                            : "Next billing"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#2D3436]">
                        {currentSub.status === "grace_period"
                          ? formatDate(currentSub.grace_period_ends_at)
                          : formatDate(currentSub.current_period_end)}
                      </p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-[#1B4332]/5 p-2">
                      <CreditCard className="h-4 w-4 text-[#1B4332]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Amount paid
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#2D3436]">
                        {formatIDR(currentSub.amount_charged)}
                        {currentSub.introductory_applied && (
                          <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            Intro
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grace period warning */}
                {isGrace && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs text-amber-800">
                      Your payment failed. Update your payment method before your grace period
                      ends to keep Pro access.
                    </p>
                  </div>
                )}

                {/* Cancel CTA — only for active Pro (Req 8.14) */}
                {isPro && currentSub.status === "active" && (
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <CancelSubscriptionButton periodEnd={currentSub.current_period_end} />
                  </div>
                )}

                {currentSub.status === "cancelled" && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <p className="text-xs text-gray-500">
                      Subscription cancelled. Pro access continues until{" "}
                      <strong>{formatDate(currentSub.current_period_end)}</strong>.{" "}
                      <Link href="/pricing" className="font-bold text-[#E76F51] hover:underline">
                        Resubscribe
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-5 shadow-sm">
                <p className="text-sm text-gray-500">
                  You&apos;re on the{" "}
                  <span className="font-bold text-[#1B4332]">Free</span> plan.
                </p>
                <Link
                  href="/pricing"
                  className="mt-3 inline-flex items-center rounded-lg bg-[#E76F51] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#E76F51]/90"
                >
                  Upgrade to Pro →
                </Link>
              </div>
            )}
          </section>

          {/* Billing history */}
          {billingHistory.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-bold text-[#2D3436]">Billing History</h2>
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                    <tr className="bg-gray-50/60">
                      {["Date", "Plan", "Amount", "Status"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {billingHistory.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50/40">
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {formatDate(entry.created_at)}
                        </td>
                        <td className="px-4 py-3 text-xs capitalize text-gray-600">
                          {entry.plan}
                          {entry.introductory_applied && (
                            <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              Intro
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-[#2D3436]">
                          {formatIDR(entry.amount_charged)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${statusLabel(entry.status).className}`}
                          >
                            {statusLabel(entry.status).label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Saved routes */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#2D3436]">
                Saved Routes
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({routes.length}{!isPro ? " / 3" : ""})
                </span>
              </h2>
              <Link
                href="/routes"
                className="text-xs font-semibold text-[#1B4332] transition hover:text-[#1B4332]/70"
              >
                View all →
              </Link>
            </div>
            <RouteListWrapper routes={routes.slice(0, 5)} tier={ctx?.tier ?? "free"} />
          </section>
        </main>
      </div>
  )
}

// ---------------------------------------------------------------------------
// Client wrapper for RouteList (needs client-side delete callbacks)
// ---------------------------------------------------------------------------

import { RouteListClientWrapper } from "@/components/routes/RouteListClientWrapper"

function RouteListWrapper({
  routes,
  tier,
}: {
  routes: SavedRoute[]
  tier: "anonymous" | "free" | "pro"
}) {
  return <RouteListClientWrapper initialRoutes={routes} tier={tier} />
}
