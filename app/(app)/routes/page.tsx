import Link from "next/link"
import { getSession } from "@/lib/auth"
import { listRoutes } from "@/lib/db/queries/routes"
import { limits } from "@/lib/entitlements"
import { Header } from "@/components/trail/Header"
import { RoutesListClient } from "@/components/routes/RoutesListClient"
import { LogIn, UserPlus } from "lucide-react"
import { getServerTranslations } from "@/lib/i18n/server"

export async function generateMetadata() {
  const { t } = await getServerTranslations()
  return {
    title: t("routes.unauthMetadataTitle"),
    description: t("routes.unauthMetadataDesc"),
  }
}

export default async function RoutesPage() {
  const [{ t }, session] = await Promise.all([
    getServerTranslations(),
    getSession(),
  ])
  const user = session?.user

  if (!user) {
    return (
      <div className="min-h-screen bg-white pb-24 sm:pb-14 lg:bg-[#FAF6F1]">
        <Header />

        <main className="mx-auto max-w-4xl px-4 pt-10 sm:px-6 sm:pt-16 lg:max-w-3xl lg:px-8 lg:pt-20">
          {/* Header section (Airbnb listing page unboxed style) */}
          <div className="text-left sm:text-center lg:rounded-3xl lg:border lg:border-[#E5E7EB] lg:bg-white lg:p-12 lg:shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
            <h1 className="mt-3 heading-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#2D3436] lg:mt-0">
              {t("routes.unauthTitle")}
            </h1>
            <p className="mt-3 text-subhead sm:mx-auto sm:max-w-xl">
              {t("routes.unauthDesc")}
            </p>

            {/* Primary actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/login?returnTo=/routes"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1B4332] px-6 text-sm font-semibold text-white transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                <LogIn className="h-4 w-4" />
                <span>{t("routes.loginCta")}</span>
              </Link>
              <Link
                href="/register?returnTo=/routes"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#2D3436] bg-white px-6 text-sm font-semibold text-[#2D3436] transition hover:bg-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                <UserPlus className="h-4 w-4" />
                <span>{t("routes.registerCta")}</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const routes = await listRoutes(user.id)
  const userLimits = limits(user)

  return (
    <div className="min-h-screen bg-[#FAF6F1] text-[#2D3436] pb-24 sm:pb-14">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10 lg:px-8">
        <RoutesListClient
          initialRoutes={routes}
          maxRoutes={userLimits.maxSavedRoutes}
          currentPlan={user.plan}
        />
      </main>
    </div>
  )
}
