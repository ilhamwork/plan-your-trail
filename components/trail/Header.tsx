"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Map, User, LogIn, UserPlus, HelpCircle, Menu } from "lucide-react"
import { MobileBottomNav } from "@/components/trail/MobileBottomNav"
import { useSession } from "@/lib/auth/client"
import { SignOutButton } from "@/components/auth/SignOutButton"
import { LanguageSwitcher } from "@/components/trail/LanguageSwitcher"
import { useI18n } from "@/lib/i18n/context"
import { dispatchStartTourEvent } from "@/components/trail/hooks/useGuidedTour"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

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
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-white/90 transition hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <HelpCircle className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            )}
            <LanguageSwitcher />

            {/* Desktop navigation (hidden on mobile where bottom navbar is used) */}
            <div className="hidden sm:flex sm:items-center">
              {isPending ? (
                <div className="h-8 w-28 animate-pulse rounded-lg bg-white/10" />
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      data-tour="nav-menu"
                      aria-label={t("nav.menuAria")}
                      title={t("nav.menu")}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-white/90 transition hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      <Menu className="h-4.5 w-4.5" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    className="w-56 rounded-xl border border-[#E5E7EB] bg-white p-1.5 text-[#2D3436] shadow-xl"
                  >
                    <div className="border-b border-[#E5E7EB] px-3 py-2">
                      <p className="text-[11px] font-medium tracking-wider text-[#6B7280] uppercase">
                        {t("nav.profile")}
                      </p>
                      <p className="truncate text-xs font-semibold text-[#2D3436]">
                        {user.name || user.email}
                      </p>
                      {user.name && user.email && (
                        <p className="truncate text-[11px] text-[#6B7280]">{user.email}</p>
                      )}
                    </div>

                    <div className="py-1">
                      <DropdownMenuItem asChild>
                        <Link
                          href="/routes"
                          data-tour="nav-routes"
                          className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                            pathname.startsWith("/routes")
                              ? "bg-[#1B4332]/10 font-semibold text-[#1B4332]"
                              : "text-[#2D3436] hover:bg-[#FAF6F1]"
                          }`}
                        >
                          <Map className="h-4 w-4 text-[#1B4332]" aria-hidden="true" />
                          <span>{t("nav.myRoutes")}</span>
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href="/account"
                          className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                            pathname.startsWith("/account")
                              ? "bg-[#1B4332]/10 font-semibold text-[#1B4332]"
                              : "text-[#2D3436] hover:bg-[#FAF6F1]"
                          }`}
                        >
                          <User className="h-4 w-4 text-[#1B4332]" aria-hidden="true" />
                          <span>{t("nav.profile")}</span>
                        </Link>
                      </DropdownMenuItem>

                      {isHome && (
                        <DropdownMenuItem
                          onClick={dispatchStartTourEvent}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[#2D3436] hover:bg-[#FAF6F1]"
                        >
                          <HelpCircle className="h-4 w-4 text-[#1B4332]" aria-hidden="true" />
                          <span>{t("tour.triggerButton")}</span>
                        </DropdownMenuItem>
                      )}
                    </div>

                    <DropdownMenuSeparator className="my-1 border-t border-[#E5E7EB]" />

                    <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                      <div className="w-full">
                        <SignOutButton className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-hidden">
                          <span>{t("nav.signOut")}</span>
                        </SignOutButton>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
