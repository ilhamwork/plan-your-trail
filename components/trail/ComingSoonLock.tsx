"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Sparkles, Check, ArrowRight, Loader2 } from "lucide-react"
import { trackEvent } from "@/lib/analytics/events"
import { useEntitlements } from "@/lib/entitlements"
import { joinWaitlistAction } from "@/app/actions/waitlist"

interface ComingSoonLockProps {
  feature: string
  title: string
  description?: string
  source: string
  badgeText?: string
  variant?: "banner" | "card" | "inline"
  className?: string
  onSuccess?: () => void
}

export function ComingSoonLock({
  feature,
  title,
  description,
  source,
  badgeText = "Segera Hadir di Pro",
  variant = "inline",
  className = "",
  onSuccess,
}: ComingSoonLockProps) {
  const { user } = useEntitlements()
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
      setErrorMsg("Gagal mendaftar waitlist. Silakan coba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegisterClick = () => {
    trackEvent("register_clicked", { source, feature })
  }

  if (variant === "card") {
    return (
      <div
        className={`rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 shadow-xs backdrop-blur-xs ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-amber-950">{title}</h4>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                  {badgeText}
                </span>
              </div>
              {description && (
                <p className="mt-1 text-xs text-amber-800/90">{description}</p>
              )}
              {errorMsg && (
                <p className="mt-1 text-xs text-red-600">{errorMsg}</p>
              )}
            </div>
          </div>

          <div className="shrink-0 self-end sm:self-center">
            {user ? (
              isJoined ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <Check className="h-3.5 w-3.5" />
                  Terdaftar Early Access
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#143326] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  )}
                  <span>Daftar Early Access</span>
                </button>
              )
            ) : (
              <Link
                href="/register"
                onClick={handleRegisterClick}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#143326]"
              >
                <span>Daftar Akun</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default: inline / banner variant
  return (
    <div
      className={`rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-3 transition-all ${className}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="text-xs font-semibold text-gray-800">{title}</span>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
            {badgeText}
          </span>
          {description && (
            <span className="hidden text-xs text-gray-500 md:inline">
              — {description}
            </span>
          )}
        </div>

        <div className="shrink-0 self-end sm:self-center">
          {user ? (
            isJoined ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <Check className="h-3 w-3" />
                Terdaftar Early Access
              </span>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={isSubmitting}
                className="text-xs font-medium text-[#1B4332] underline hover:text-[#143326] disabled:opacity-50"
              >
                {isSubmitting ? "Mendaftar..." : "Daftar Early Access"}
              </button>
            )
          ) : (
            <Link
              href="/register"
              onClick={handleRegisterClick}
              className="text-xs font-medium text-[#1B4332] underline hover:text-[#143326]"
            >
              Daftar Akun
            </Link>
          )}
        </div>
      </div>
      {errorMsg && <p className="mt-1 text-xs text-red-600">{errorMsg}</p>}
    </div>
  )
}
