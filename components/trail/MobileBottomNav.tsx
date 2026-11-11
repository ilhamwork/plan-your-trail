"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Route, CircleUserRound } from "lucide-react"
import { useSession } from "@/lib/auth/client"

export function MobileBottomNav() {
  const { data: sessionData } = useSession()
  const pathname = usePathname()
  const user = sessionData?.user

  const isHomeActive = pathname === "/"
  const isRoutesActive =
    pathname === "/routes" || pathname?.startsWith("/routes/")
  const isAccountActive =
    pathname === "/account" || pathname?.startsWith("/account/")
  const isAuthActive =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"

  return (
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

        {user ? (
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
        ) : (
          <Link
            href="/login"
            aria-current={isAuthActive ? "page" : undefined}
            className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-3 py-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
              isAuthActive
                ? "font-semibold text-[#1B4332]"
                : "font-medium text-[#6B7280] hover:text-[#2D3436]"
            }`}
          >
            <CircleUserRound
              className="h-6 w-6"
              strokeWidth={isAuthActive ? 2.25 : 1.75}
            />
            <span className="text-[11px] leading-none">Log In</span>
          </Link>
        )}
      </div>
    </nav>
  )
}

