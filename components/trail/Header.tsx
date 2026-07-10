"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { ChevronDown, LogOut, Settings, Tag } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

/**
 * App header with auth-aware navigation.
 *
 * Requirements: 1.12
 */
export function Header() {
  const { user, tier, isLoading, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  // User initials from email
  const initials = user?.email ? user.email[0].toUpperCase() : "?"

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-[1001] border-b border-[#1B4332]/10 bg-[#1B4332] shadow-md"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/text-logo-white.png"
            alt="Plan Your Trail"
            width={160}
            height={40}
          />
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right section */}
        {isLoading ? (
          /* Loading skeleton */
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 animate-pulse rounded-lg bg-white/20" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-white/20" />
          </div>
        ) : user ? (
          /* Authenticated */
          <div className="flex items-center gap-3">
            {/* My Routes link */}
            <Link
              href="/routes"
              className="hidden text-sm font-medium text-white/80 transition hover:text-white sm:block"
            >
              My Routes
            </Link>

            {/* Avatar + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full transition focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                {/* Avatar circle */}
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white ring-2 ring-white/30">
                  {initials}
                  {/* Pro chip */}
                  {tier === "pro" && (
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-900">
                      Pro
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-white/70 transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                  {/* Email */}
                  <div className="border-b border-gray-50 px-3 py-2.5">
                    <p className="truncate text-[11px] text-gray-400">
                      {user.email}
                    </p>
                    {tier === "pro" && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Pro
                      </span>
                    )}
                  </div>

                  <nav className="py-1">
                    <Link
                      href="/account"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#2D3436] transition hover:bg-gray-50"
                    >
                      <Settings className="h-3.5 w-3.5 text-gray-400" />
                      Account
                    </Link>
                    <Link
                      href="/pricing"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#2D3436] transition hover:bg-gray-50"
                    >
                      <Tag className="h-3.5 w-3.5 text-gray-400" />
                      Pricing
                    </Link>
                    <button
                      onClick={async () => {
                        setDropdownOpen(false)
                        await signOut()
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-500 transition hover:bg-red-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Unauthenticated */
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-[#1B4332] transition hover:bg-white/90"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </motion.header>
  )
}
