"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Map, User, LogIn, UserPlus, HelpCircle } from "lucide-react"
import { MobileBottomNav } from "@/components/trail/MobileBottomNav"
import { useSession } from "@/lib/auth/client"
import { SignOutButton } from "@/components/auth/SignOutButton"
import { LanguageSwitcher } from "@/components/trail/LanguageSwitcher"
import { useI18n } from "@/lib/i18n/context"
import { dispatchStartTourEvent } from "@/components/trail/hooks/useGuidedTour"

export function Header() {
  const { data: sessionData, isPending } = useSession()
  const { t } = useI18n()
  const pathname = usePathname()
  const user = sessionData?.user
  const isHome = pathname === "/"

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-1001 border-b border-[#1B4332]/10 bg-[#1B4332] shadow-md"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/text-logo-white.png"
              alt="PlanYourTrail"
              width={160}
              height={40}
              priority
            />
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {isHome && (
              <button
                type="button"
                onClick={dispatchStartTourEvent}
                aria-label={t("tour.triggerAria")}
                title={t("tour.triggerButton")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t("tour.triggerButton")}</span>
              </button>
            )}
            <LanguageSwitcher />

            {/* Desktop navigation (hidden on mobile where bottom navbar is used) */}
            <div className="hidden sm:flex sm:items-center">
              {isPending ? (
                <div className="h-8 w-28 animate-pulse rounded-lg bg-white/10" />
              ) : user ? (
                <nav aria-label="Primary navigation" className="flex items-center gap-2">
                  <Link
                    href="/routes"
                    data-tour="nav-routes"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      pathname.startsWith("/routes")
                        ? "bg-white/20 text-white shadow-2xs"
                        : "bg-white/10 text-white/90 hover:bg-white/20 hover:text-white"
                    }`}
                    title={t("nav.myRoutes")}
                  >
                    <Map className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden md:inline">{t("nav.myRoutes")}</span>
                  </Link>
                  <Link
                    href="/account"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      pathname.startsWith("/account")
                        ? "bg-white/20 text-white shadow-2xs"
                        : "bg-white/10 text-white/90 hover:bg-white/20 hover:text-white"
                    }`}
                    title={t("nav.manageAccount")}
                  >
                    <User className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden md:inline">{t("nav.profile")}</span>
                  </Link>
                  <SignOutButton className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-red-500/25 hover:text-white" />
                </nav>
              ) : (
                <div data-tour="header-auth" className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/10"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>{t("nav.login")}</span>
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-emerald-500"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>{t("nav.register")}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Bottom Navbar (Airbnb style) */}
      <MobileBottomNav />
    </>
  )
}
