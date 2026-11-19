import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { limits } from "@/lib/entitlements"
import { SignOutButton } from "@/components/auth/SignOutButton"
import { Header } from "@/components/trail/Header"
import { Footer } from "@/components/trail/Footer"
import { getServerTranslations } from "@/lib/i18n/server"
import {
  CloudSun,
  MapPin,
  Clock,
  Compass,
  Route as RouteIcon,
  ShieldCheck,
  ChevronRight,
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const [{ t }, user] = await Promise.all([
    getServerTranslations(),
    requireUser(),
  ])
  const userLimits = limits(user)
  const initial = user.email.charAt(0).toUpperCase()
  const maxUploadMb = Math.round(userLimits.maxUploadBytes / (1024 * 1024))

  return (
    <div className="min-h-screen bg-[#FAF6F1] pb-24 sm:pb-14">
      <Header />

      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        {/* Page Heading */}
        <div className="mb-8">
          <h1 className="heading-1">
            {t("account.heading")}
          </h1>
          <p className="mt-1 text-subhead">
            {t("account.subtitle")}
          </p>
        </div>

        {/* Two-column Airbnb Profile Layout */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[340px_1fr] lg:gap-12">
          {/* Left Column: Airbnb Identity Card */}
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,0.06)] lg:sticky lg:top-24">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#1B4332] text-3xl font-bold text-[#FAF6F1] shadow-sm">
                {initial}
              </div>
              <h2 className="heading-3 mt-4 max-w-full truncate text-base sm:text-lg font-bold tracking-tight text-[#2D3436]">
                {user.email}
              </h2>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F1EDE8] px-3.5 py-1 text-xs font-semibold text-[#1B4332]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{user.plan === "pro" ? t("account.planBadgePro") : t("account.planBadgeFree")}</span>
              </span>
            </div>

            <div className="my-6 border-t border-[#E5E7EB]" />

            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-[#4B5563]">{t("account.uploadLimitLabel")}</dt>
                <dd className="font-semibold text-[#2D3436]">{maxUploadMb} MB</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#4B5563]">{t("account.routesCapacityLabel")}</dt>
                <dd className="font-semibold text-[#2D3436]">
                  {userLimits.maxSavedRoutes ?? t("account.unlimited")}{" "}
                  {userLimits.maxSavedRoutes !== null ? t("account.routesUnit") : ""}
                </dd>
              </div>
            </dl>

            <div className="mt-6 space-y-2.5">
              <Link
                href="/routes"
                className="flex h-11 w-full items-center justify-between rounded-xl bg-[#FAF6F1] px-4 text-sm font-semibold text-[#1B4332] transition hover:bg-[#F1EDE8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                <span className="inline-flex items-center gap-2">
                  <RouteIcon className="h-4 w-4" />
                  <span>{t("account.viewSavedRoutes")}</span>
                </span>
                <ChevronRight className="h-4 w-4" />
              </Link>

              <SignOutButton className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2D3436] bg-white px-4 text-sm font-semibold text-[#2D3436] transition hover:bg-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] disabled:opacity-50">
                <span>{t("account.signOutBtn")}</span>
              </SignOutButton>
            </div>
          </div>

          {/* Right Column: Flat Editorial Feature & Roadmap Sections (Airbnb Style) */}
          <div className="space-y-8">
            {/* Active Features List */}
            <section aria-labelledby="active-features-heading">
              <h2
                id="active-features-heading"
                className="heading-2 pb-4 border-b border-[#E5E7EB]"
              >
                {t("account.activeFeaturesHeading")}
              </h2>

              <ul className="divide-y divide-[#E5E7EB]">
                <li className="flex items-start gap-4 py-5">
                  <CloudSun className="mt-0.5 h-5 w-5 shrink-0 text-[#2A9D8F]" />
                  <div>
                    <p className="text-sm font-semibold text-[#2D3436]">
                      {t("account.featureWeatherTitle")}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#4B5563]">
                      {t("account.featureWeatherDesc")}
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4 py-5">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#E76F51]" />
                  <div>
                    <p className="text-sm font-semibold text-[#2D3436]">
                      {t("account.featureWaypointsTitle")}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#4B5563]">
                      {t("account.featureWaypointsDesc")}
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4 py-5">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#1B4332]" />
                  <div>
                    <p className="text-sm font-semibold text-[#2D3436]">
                      {t("account.featurePaceTitle")}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#4B5563]">
                      {t("account.featurePaceDesc")}
                    </p>
                  </div>
                </li>
              </ul>
            </section>

            {/* Pro Roadmap Section */}
            <section
              aria-labelledby="pro-roadmap-heading"
              className="border-t border-[#D1D5DB] pt-8"
            >
              <div className="flex items-start gap-4">
                <Compass className="mt-0.5 h-5 w-5 shrink-0 text-[#1B4332]" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      id="pro-roadmap-heading"
                      className="text-base font-bold text-[#2D3436]"
                    >
                      {t("account.proRoadmapTitle")}
                    </h3>
                    <span className="rounded-full bg-[#F1EDE8] px-2.5 py-0.5 text-[11px] font-semibold text-[#1B4332]">
                      {t("account.proRoadmapBadge")}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#4B5563]">
                    {t("account.proRoadmapDesc")}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-12 hidden border-t border-[#E5E7EB] pt-6 lg:block">
          <Footer />
        </div>
      </main>
    </div>
  )
}
