"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Check, Loader2, type LucideIcon } from "lucide-react"
import { trackEvent } from "@/lib/analytics/events"
import { useEntitlements } from "@/lib/entitlements"
import { joinWaitlistAction } from "@/app/actions/waitlist"
import { useI18n } from "@/lib/i18n/context"

interface ComingSoonLockProps {
  feature: string
  title: string
  description?: string
  source: string
  badgeText?: string
  icon?: LucideIcon
  variant?: "banner" | "card" | "inline"
  hideCta?: boolean
  previewSlot?: React.ReactNode
  className?: string
  onSuccess?: () => void
}

export function ComingSoonLock({
  feature,
  title,
  description,
  source,
  badgeText,
  icon: Icon,
  hideCta = false,
  previewSlot,
  className = "",
  onSuccess,
}: ComingSoonLockProps) {
  const { user } = useEntitlements()
  const { t } = useI18n()
  const resolvedBadgeText =
    badgeText !== undefined ? badgeText : t("comingSoon.badgeDefault")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isJoined, setIsJoined] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Track locked_feature_viewed when rendered (PRD 6.3 & E6-T2)
  useEffect(() => {
    trackEvent("locked_feature_viewed", { feature, source })
  }, [feature, source])

  const handleJoin = async () => {
    if (!user) return
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await joinWaitlistAction({ feature })
      if (res.ok) {
        setIsJoined(true)
        trackEvent("waitlist_joined", { feature, source })
        onSuccess?.()
      } else {
        setErrorMsg(res.error.message)
      }
    } catch {
      setErrorMsg(t("comingSoon.joinError"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegisterClick = () => {
    trackEvent("register_clicked", { source, feature })
  }

  return (
    <div className={`rounded-2xl border border-[#E5E7EB] bg-white p-5 ${className}`}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF6F1] text-[#1B4332]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug tracking-tight text-[#111827]">
            {title}
          </h3>
          {description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#4B5563]">
              {description}
            </p>
          )}
          {resolvedBadgeText && (
            <p className="mt-1 text-xs font-medium text-[#525B66]">
              {resolvedBadgeText}
            </p>
          )}
        </div>
      </div>

      {previewSlot}

      {errorMsg && (
        <p role="alert" className="mt-3 text-xs font-medium text-[#B91C1C]">
          {errorMsg}
        </p>
      )}

      {!hideCta && (
        <div className="mt-5">
          {user ? (
            isJoined ? (
              <div className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-50 px-6 py-2.5 text-sm font-semibold text-emerald-900">
                <Check className="h-4 w-4" />
                <span>{t("comingSoon.joined")}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={isSubmitting}
                className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#1B4332] px-6 py-2.5 text-sm font-semibold text-[#FAF6F1] transition hover:bg-[#143326] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {isSubmitting ? t("comingSoon.joining") : t("comingSoon.joinBtn")}
                </span>
              </button>
            )
          ) : (
            <Link
              href="/login"
              onClick={handleRegisterClick}
              className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#1B4332] px-6 py-2.5 text-sm font-semibold text-[#FAF6F1] transition hover:bg-[#143326] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
            >
              {t("comingSoon.loginBtn")}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
