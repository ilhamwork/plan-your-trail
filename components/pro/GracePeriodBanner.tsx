"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

/**
 * Sticky banner shown when the user's subscription is in a grace period.
 * Dismissible per-session via sessionStorage.
 *
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */
export function GracePeriodBanner() {
  const { gracePeriodEndsAt } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  // Build the per-session key based on the grace period end date
  const sessionKey = gracePeriodEndsAt?.toISOString() ?? null

  // Hydrate from sessionStorage after mount (SSR-safe)
  useEffect(() => {
    if (!sessionKey) return
    try {
      const stored = sessionStorage.getItem(
        `grace_banner_dismissed_${sessionKey}`
      )
      if (stored === "true") {
        setDismissed(true)
      }
    } catch {
      // sessionStorage unavailable
    }
  }, [sessionKey])

  // Don't render if no grace period or already dismissed
  if (!gracePeriodEndsAt || !sessionKey || dismissed) return null

  const daysRemaining = Math.ceil(
    (gracePeriodEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  // Grace period already expired — don't show stale banner
  if (daysRemaining <= 0) return null

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(`grace_banner_dismissed_${sessionKey}`, "true")
    } catch {
      // Best-effort
    }
  }

  return (
    <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="flex-1 text-xs font-medium text-amber-900">
          ⚠️ Your Pro subscription payment failed.{" "}
          <span className="font-bold">
            {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
          </span>{" "}
          to resolve.{" "}
          <Link
            href="/account"
            className="font-bold text-[#E76F51] underline underline-offset-2 hover:text-[#E76F51]/80"
          >
            Resolve now →
          </Link>
        </p>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss grace period banner"
          className="shrink-0 rounded p-1 text-amber-600 transition hover:bg-amber-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
