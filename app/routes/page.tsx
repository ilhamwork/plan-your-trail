import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { resolveTier } from "@/lib/access-guard"
import { RouteListClientWrapper } from "@/components/routes/RouteListClientWrapper"
import type { SavedRoute } from "@/components/routes/RouteList"

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata = {
  title: "My Routes — PlanYourTrail",
  description: "Browse and manage your saved GPX routes.",
}

// ---------------------------------------------------------------------------
// Page — protected server component
// Requirements: 5.1, 5.2
// ---------------------------------------------------------------------------

export default async function RoutesPage() {
  // 1. Redirect unauthenticated users (handled by middleware, but guarded here too)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirectAfter=/routes")
  }

  // 2. Resolve tier
  let ctx
  try {
    ctx = await resolveTier()
  } catch {
    redirect("/auth/login?redirectAfter=/routes")
  }

  // 3. Fetch all active (non-deleted) routes for this user
  const { data, error } = await supabase
    .from("saved_routes")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) {
    // Surface a friendly error rather than crashing
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF6F1]">
        <p className="text-sm text-gray-500">
          Failed to load your routes. Please try refreshing the page.
        </p>
      </div>
    )
  }

  const routes = (data ?? []) as SavedRoute[]
  const tier = ctx?.tier ?? "free"
  const isPro = tier === "pro"

  return (
    <div className="min-h-screen bg-[#FAF6F1]">
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
            <span className="text-sm font-bold text-[#2D3436]">My Routes</span>
            <Link
              href="/account"
              className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
            >
              Account
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-8">
          {/* Page title + stats */}
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-[#2D3436]">
                Saved Routes
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                {routes.length} route{routes.length !== 1 ? "s" : ""}
                {!isPro && (
                  <span className="ml-1">
                    ·{" "}
                    <span
                      className={
                        routes.length >= 3
                          ? "font-semibold text-[#E76F51]"
                          : "text-gray-400"
                      }
                    >
                      {routes.length} / 3 free slots used
                    </span>
                  </span>
                )}
              </p>
            </div>

            {!isPro && (
              <Link
                href="/pricing"
                className="rounded-lg bg-[#E76F51] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#E76F51]/90"
              >
                Upgrade for unlimited →
              </Link>
            )}
          </div>

          {/* Route list */}
          <RouteListClientWrapper initialRoutes={routes} tier={tier} />
        </main>
      </div>
  )
}
