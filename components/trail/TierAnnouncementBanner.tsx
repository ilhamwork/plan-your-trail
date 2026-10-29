"use client"

import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { Megaphone, X, ArrowRight } from "lucide-react"
import { useEntitlements } from "@/lib/entitlements"
import { trackEvent } from "@/lib/analytics/events"
import { useI18n } from "@/lib/i18n/context"

const BANNER_STORAGE_KEY = "dismissed_tier_banner_v1"

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

export function TierAnnouncementBanner() {
  const { isAuthenticated } = useEntitlements()
  const { t } = useI18n()
  const [localDismissed, setLocalDismissed] = useState(false)

  const isSessionDismissed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return sessionStorage.getItem(BANNER_STORAGE_KEY) === "1"
      } catch {
        return false
      }
    },
    () => false
  )

  if (isSessionDismissed || localDismissed) {
    return null
  }

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(BANNER_STORAGE_KEY, "1")
    } catch {
      // ignore storage errors
    }
    setLocalDismissed(true)
  }

  const handleRegisterClick = () => {
    trackEvent("register_clicked", {
      source: "tier_announcement_banner",
      feature: "free_tier_launch",
    })
  }

  return (
    <div
      role="region"
      aria-label={t("home.tierBanner.regionAria")}
      className="border-b border-[#1B4332]/15 bg-[#E9F5EE] text-[#1B4332]"
    >
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 py-2.5 sm:items-center">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5 sm:items-center">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1B4332]/10 text-[#1B4332] sm:mt-0">
              <Megaphone className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs leading-relaxed text-[#1B4332]">
              <span className="font-bold">{t("home.tierBanner.badge")}</span>{" "}
              {t("home.tierBanner.text")}
            </p>
          </div>

          {!isAuthenticated && (
            <div className="shrink-0 pl-8 sm:pl-0">
              <Link
                href="/register"
                onClick={handleRegisterClick}
                className="inline-flex items-center gap-1 rounded-lg bg-[#1B4332] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#143326] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                <span>{t("home.tierBanner.cta")}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("home.tierBanner.closeAria")}
          className="shrink-0 rounded-md p-1.5 text-[#1B4332]/70 transition hover:bg-[#1B4332]/10 hover:text-[#1B4332] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
