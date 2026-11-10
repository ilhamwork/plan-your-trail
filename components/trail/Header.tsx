"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  User,
  LogIn,
  UserPlus,
  Map,
  Home,
  Route,
  CircleUserRound,
} from "lucide-react"
import { useSession } from "@/lib/auth/client"
import { SignOutButton } from "@/components/auth/SignOutButton"
import { LanguageSwitcher } from "@/components/trail/LanguageSwitcher"
import { useI18n } from "@/lib/i18n/context"

export function Header() {
  const { data: sessionData, isPending } = useSession()
  const { t } = useI18n()
  const pathname = usePathname()
  const user = sessionData?.user

  const isHomeActive = pathname === "/"
  const isRoutesActive =
    pathname === "/routes" || pathname?.startsWith("/routes/")
  const isAccountActive =
    pathname === "/account" || pathname?.startsWith("/account/")
  const isLoginActive = pathname === "/login"

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-1001 border-b border-[#1B4332]/10 bg-[#1B4332] shadow-md"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
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
            <LanguageSwitcher />

            {/* Desktop navigation (hidden on mobile where bottom navbar is used) */}
            <div className="hidden sm:flex sm:items-center">
              {isPending ? (
                <div className="h-8 w-20 animate-pulse rounded-lg bg-white/10" />
              ) : user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href="/routes"
                    className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                    title={t("nav.myRoutes")}
                  >
                    <Map className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/account"
                    className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                    title={t("nav.manageAccount")}
                  >
                    <User className="h-3.5 w-3.5" />
                  </Link>
                  <SignOutButton className="rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/30" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
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
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed inset-x-0 bottom-0 z-1001 border-t border-[#E5E7EB] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.04)] backdrop-blur-md sm:hidden"
      >
        <div className="mx-auto flex h-16 max-w-md items-center justify-evenly px-4">
          <Link
            href="/"
            aria-current={isHomeActive ? "page" : undefined}
            className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-3 py-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
              isHomeActive
                ? "font-semibold text-[#1B4332]"
                : "font-medium text-[#6B7280] hover:text-[#2D3436]"
            }`}
          >
            <Home
              className="h-6 w-6"
              strokeWidth={isHomeActive ? 2.25 : 1.75}
            />
            <span className="text-[11px] leading-none">Home</span>
          </Link>

          {user ? (
            <>
              <Link
                href="/routes"
                aria-current={isRoutesActive ? "page" : undefined}
                className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-3 py-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
                  isRoutesActive
                    ? "font-semibold text-[#1B4332]"
                    : "font-medium text-[#6B7280] hover:text-[#2D3436]"
                }`}
              >
                <Route
                  className="h-6 w-6"
                  strokeWidth={isRoutesActive ? 2.25 : 1.75}
                />
                <span className="text-[11px] leading-none">Route</span>
              </Link>

              <Link
                href="/account"
                aria-current={isAccountActive ? "page" : undefined}
                className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-3 py-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
                  isAccountActive
                    ? "font-semibold text-[#1B4332]"
                    : "font-medium text-[#6B7280] hover:text-[#2D3436]"
                }`}
              >
                <CircleUserRound
                  className="h-6 w-6"
                  strokeWidth={isAccountActive ? 2.25 : 1.75}
                />
                <span className="text-[11px] leading-none">Profile</span>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              aria-current={isLoginActive ? "page" : undefined}
              className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-3 py-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
                isLoginActive
                  ? "font-semibold text-[#1B4332]"
                  : "font-medium text-[#6B7280] hover:text-[#2D3436]"
              }`}
            >
              <CircleUserRound
                className="h-6 w-6"
                strokeWidth={isLoginActive ? 2.25 : 1.75}
              />
              <span className="text-[11px] leading-none">Log In</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}
