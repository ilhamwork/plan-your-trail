"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
import Link from "next/link"
import { Lock, X, ArrowRight } from "lucide-react"
import { trackEvent } from "@/lib/analytics/events"
import { useEntitlements, type Feature } from "@/lib/entitlements"

interface GatedPromptProps {
  feature: Feature | string
  title: string
  description: string
  source: string
  ctaText?: string
  href?: string
  className?: string
  guestOnly?: boolean
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

export function GatedPrompt({
  feature,
  title,
  description,
  source,
  ctaText = "Daftar",
  href = "/register",
  className = "",
  guestOnly = true,
}: GatedPromptProps) {
  const { isAuthenticated, can } = useEntitlements()
  const [localDismissed, setLocalDismissed] = useState(false)

  const isSessionDismissed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return sessionStorage.getItem(`dismissed_gated_${feature}`) === "1"
      } catch {
        return false
      }
    },
    () => false
  )

  const isFeatureAllowed = can(feature as Feature)
  const isHidden =
    (guestOnly && isAuthenticated) ||
    isFeatureAllowed ||
    isSessionDismissed ||
    localDismissed

  useEffect(() => {
    if (!isHidden) {
      trackEvent("locked_feature_viewed", { feature, source })
    }
  }, [feature, source, isHidden])

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(`dismissed_gated_${feature}`, "1")
    } catch {
      // silent
    }
    setLocalDismissed(true)
  }

  const handleCtaClick = () => {
    trackEvent("register_clicked", { source, feature })
  }

  if (isHidden) return null

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-emerald-800/10 bg-emerald-50/70 p-4 shadow-sm backdrop-blur-xs transition-all dark:border-emerald-700/20 dark:bg-emerald-950/30 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h4>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              {description}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={href}
                onClick={handleCtaClick}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-3 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-[#143326] focus:outline-hidden"
              >
                <span>{ctaText}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md p-1 text-gray-400 transition hover:bg-gray-200/50 hover:text-gray-600 focus:outline-hidden dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Tutup pesan"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
