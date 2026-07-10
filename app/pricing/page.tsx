import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PricingCard } from "@/components/pro/PricingCard"
import { CheckoutButton } from "@/components/pro/CheckoutButton"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { createSupabaseAdminClient } from "@/lib/supabase-server"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PricingData {
  introUsed: boolean
  isAuthenticated: boolean
  isPro: boolean
}

// ---------------------------------------------------------------------------
// Server-side data fetching
// ---------------------------------------------------------------------------

async function getPricingData(): Promise<PricingData> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Unauthenticated: show intro price by default (Req 14.5, 14.6)
      return { introUsed: false, isAuthenticated: false, isPro: false }
    }

    // Check subscription status
    const admin = createSupabaseAdminClient()
    const { data: sub } = await admin
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .in("status", ["active", "grace_period", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    const now = new Date()
    const isPro =
      sub?.status === "active" ||
      sub?.status === "grace_period" ||
      (sub?.status === "cancelled" &&
        new Date(sub.current_period_end) >= now) ||
      false

    // Fetch intro_price_used from profiles (Req 14.7)
    const { data: profile } = await admin
      .from("profiles")
      .select("intro_price_used")
      .eq("id", user.id)
      .single()

    // Fallback to showing intro price on DB error (Req 13.1)
    const introUsed = profile?.intro_price_used ?? false

    return { introUsed, isAuthenticated: true, isPro }
  } catch {
    // Req 13.1: fallback on auth/data error — show intro offer
    return { introUsed: false, isAuthenticated: false, isPro: false }
  }
}

// ---------------------------------------------------------------------------
// Feature lists
// ---------------------------------------------------------------------------

const FREE_FEATURES = [
  "Upload & analyze GPX files",
  "Interactive route map",
  "Elevation profile",
  "Segment breakdown",
  "Gradient distribution",
  "Save up to 3 routes",
  "10 MB max file size",
]

const PRO_MONTHLY_FEATURES = [
  "Everything in Free",
  "Unlimited saved routes",
  "25 MB max file size",
  "Custom waypoints",
  "Weather forecast along route",
  "Waypoint labels on elevation chart",
  "Pace & cutoff estimator",
  "PDF export",
  "Route comparison",
  "Training notes per route",
  "Public share links",
]

const PRO_ANNUAL_FEATURES = [
  ...PRO_MONTHLY_FEATURES,
  "Best value — save ~32% vs monthly",
]

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Pricing — PlanYourTrail",
  description:
    "Upgrade to Pro for unlimited routes, weather forecasts, pace estimator, PDF export, and more.",
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PricingPage() {
  const { introUsed, isAuthenticated, isPro } = await getPricingData()

  // Show intro badge when: unauthenticated OR authenticated with intro_price_used=false (Req 14.6)
  // Hide intro badge when intro_price_used=true (Req 14.7)
  const showIntro = !introUsed

  return (
    <div className="min-h-screen bg-[#FAF6F1]">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-[#1B4332] transition hover:text-[#1B4332]/70"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
          <span className="text-sm font-bold text-[#2D3436]">
            PlanYourTrail
          </span>
          {!isAuthenticated && (
            <Link
              href="/auth/login"
              className="rounded-lg bg-[#1B4332] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#1B4332]/90"
            >
              Sign in
            </Link>
          )}
          {isAuthenticated && (
            <Link
              href="/account"
              className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
            >
              My account
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-[#2D3436]">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-base text-gray-500">
            Start free. Upgrade when you need more.
          </p>
          {isPro && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#E76F51]/10 px-4 py-1.5 text-sm font-bold text-[#E76F51]">
              ✓ You&apos;re on Pro — enjoy all features
            </p>
          )}
        </div>

        {/* Cards grid — three columns on desktop (Req 14.1) */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Free tier */}
          <PricingCard
            tier="free"
            features={FREE_FEATURES}
            price="Free"
            ctaLabel={isAuthenticated ? "Your current plan" : "Get started free"}
            onCta={undefined}
          />

          {/* Pro Monthly — Most Popular badge + intro (Req 14.2, 14.3) */}
          <PricingCard
            tier="pro"
            features={PRO_MONTHLY_FEATURES}
            price="Rp 49.000 / month"
            introPrice={showIntro ? "Rp 29.000" : undefined}
            isRecommended={true}
            ctaLabel={
              isPro ? "Active plan" : showIntro ? "Start with intro price" : "Upgrade to Pro"
            }
            onCta={undefined}
          />

          {/* Pro Annual (Req 14.4) */}
          <PricingCard
            tier="pro"
            features={PRO_ANNUAL_FEATURES}
            price="Rp 399.000 / year"
            ctaLabel={isPro ? "Switch to annual" : "Get annual plan"}
            onCta={undefined}
          />
        </div>

        {/* Checkout buttons (client components for interactivity) */}
        {!isPro && (
          <Suspense fallback={null}>
            <CheckoutSection
              isAuthenticated={isAuthenticated}
              showIntro={showIntro}
            />
          </Suspense>
        )}

        {/* Feature comparison note */}
        <p className="mt-12 text-center text-xs text-gray-400">
          All plans include unlimited GPX analysis sessions. Saved routes are
          stored securely in your account. Cancel anytime — no questions asked.
        </p>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Checkout section (client component wrapper)
// ---------------------------------------------------------------------------

function CheckoutSection({
  isAuthenticated,
  showIntro,
}: {
  isAuthenticated: boolean
  showIntro: boolean
}) {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      {/* Monthly CTA */}
      <CheckoutButton
        plan="monthly"
        isAuthenticated={isAuthenticated}
        label={showIntro ? "Start with intro price — Rp 29.000" : "Upgrade monthly — Rp 49.000"}
        className="w-full rounded-xl bg-[#E76F51] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#E76F51]/90 active:scale-95 sm:w-auto"
      />
      {/* Annual CTA */}
      <CheckoutButton
        plan="annual"
        isAuthenticated={isAuthenticated}
        label="Get annual plan — Rp 399.000"
        className="w-full rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-[#2D3436] transition hover:bg-gray-50 active:scale-95 sm:w-auto"
      />
    </div>
  )
}
