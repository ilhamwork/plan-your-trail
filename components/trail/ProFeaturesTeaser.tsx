"use client"

import { useState, useEffect } from "react"
import {
  Check,
  Clock,
  CloudSun,
  CloudRain,
  Droplets,
  Lock,
  Loader2,
  Flag,
  Sun,
} from "lucide-react"
import type { Waypoint } from "@/lib/types"
import { useEntitlements } from "@/lib/entitlements"
import { useI18n } from "@/lib/i18n/context"
import { trackEvent } from "@/lib/analytics/events"
import { joinWaitlistAction } from "@/app/actions/waitlist"

interface ProFeaturesTeaserProps {
  waypoints?: Waypoint[]
}

/**
 * Unified Pro features teaser for logged-in Free users.
 * Combines Cutoff Estimator per Checkpoint and Hourly Weather Forecast
 * into a single section with one Early Access CTA.
 */
export function ProFeaturesTeaser({ waypoints = [] }: ProFeaturesTeaserProps) {
  const { user, can } = useEntitlements()
  const { t } = useI18n()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isJoined, setIsJoined] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const hasCutoffAccess = can("cutoff_estimator")
  const hasHourlyAccess = can("weather_hourly")

  const shouldShow = !!user && (!hasCutoffAccess || !hasHourlyAccess)

  useEffect(() => {
    if (!shouldShow) return
    trackEvent("locked_feature_viewed", {
      feature: "cutoff_estimator",
      source: "pro_features_teaser",
    })
  }, [shouldShow])

  if (!shouldShow) {
    return null
  }

  const handleJoin = async () => {
    if (!user || isSubmitting || isJoined) return
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await joinWaitlistAction({ feature: "cutoff_estimator" })
      if (res.ok) {
        setIsJoined(true)
        trackEvent("waitlist_joined", {
          feature: "cutoff_estimator",
          source: "pro_features_teaser",
        })
      } else {
        setErrorMsg(res.error.message)
      }
    } catch {
      setErrorMsg(t("proTeaser.joinError"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section aria-label={t("proTeaser.title")} className="py-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-bold tracking-tight text-[#111827]">
          {t("proTeaser.title")}
        </h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
          <Flag className="h-3 w-3" aria-hidden="true" />
          {t("proTeaser.badge")}
        </span>
      </div>
      <p className="mt-0.5 text-xs font-medium text-[#4B5563]">
        {t("proTeaser.subtitle")}
      </p>

      <div className="mt-5 space-y-6">
        {/* 1. Cutoff Estimator per Checkpoint */}
        {!hasCutoffAccess && (
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-[#1B4332]" aria-hidden="true" />
              <h4 className="text-sm font-bold text-[#111827]">
                {t("proTeaser.cutoffTitle")}
              </h4>
            </div>
            <p className="mt-1 text-xs text-[#4B5563]">
              {t("proTeaser.cutoffDesc")}
            </p>

            <div className="mt-3 overflow-x-auto border-t border-[#E5E7EB]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E5E7EB] text-[11px] font-bold text-[#4B5563]">
                  <tr>
                    <th className="py-2.5 pr-3">{t("proTeaser.colCheckpoint")}</th>
                    <th className="px-3 py-2.5">{t("proTeaser.colDistance")}</th>
                    <th className="px-3 py-2.5">{t("proTeaser.colEta")}</th>
                    <th className="py-2.5 pl-3">{t("proTeaser.colCutoff")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-[#4B5563] tabular-nums">
                  {waypoints.slice(0, 3).map((wp, i) => (
                    <tr key={wp.id || i}>
                      <td className="py-2.5 pr-3 font-medium text-[#2D3436]">
                        {wp.name}
                      </td>
                      <td className="px-3 py-2.5">
                        {(wp.distance / 1000).toFixed(1)} km
                      </td>
                      <td className="px-3 py-2.5">{t("proTeaser.comingSoonCell")}</td>
                      <td className="py-2.5 pl-3">{t("proTeaser.comingSoonCell")}</td>
                    </tr>
                  ))}
                  {waypoints.length === 0 && (
                    <tr>
                      <td className="py-2.5 pr-3 font-medium text-[#2D3436]">
                        {t("proTeaser.sampleCheckpointCell")}
                      </td>
                      <td className="px-3 py-2.5">12.5 km</td>
                      <td className="px-3 py-2.5">{t("proTeaser.comingSoonCell")}</td>
                      <td className="py-2.5 pl-3">{t("proTeaser.comingSoonCell")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Hourly Weather Forecast */}
        {!hasHourlyAccess && (
          <div className={!hasCutoffAccess ? "border-t border-[#E5E7EB] pt-5" : ""}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CloudSun className="h-4 w-4 shrink-0 text-[#1B4332]" aria-hidden="true" />
                <h4 className="text-sm font-bold text-[#111827]">
                  {t("proTeaser.hourlyTitle")}
                </h4>
              </div>
              <span className="shrink-0 rounded-full bg-[#1B4332]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1B4332]">
                {t("authWall.exampleBadge")}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#4B5563]">
              {t("proTeaser.hourlyDesc")}
            </p>

            {/* Subtle horizontal hourly forecast teaser strip */}
            <div
              aria-hidden="true"
              className="mt-3 flex items-stretch gap-2 overflow-x-auto pb-1"
            >
              {[
                { time: "05:00", temp: "13°", rain: "10%", Icon: Sun, alert: false },
                { time: "06:00", temp: "15°", rain: "15%", Icon: CloudSun, alert: false },
                { time: "07:00", temp: "18°", rain: "25%", Icon: CloudSun, alert: false },
                { time: "08:00", temp: "19°", rain: "65%", Icon: CloudRain, alert: true },
              ].map((slot) => (
                <div
                  key={slot.time}
                  className={`flex min-w-[72px] flex-1 flex-col items-center rounded-xl border px-2 py-2 text-center tabular-nums ${
                    slot.alert
                      ? "border-amber-300 bg-amber-50/70"
                      : "border-[#E5E7EB] bg-[#FAF6F1]/60"
                  }`}
                >
                  <span className="text-[11px] font-semibold text-[#4B5563]">
                    {slot.time}
                  </span>
                  <slot.Icon
                    className={`my-1 h-4 w-4 ${
                      slot.alert ? "text-amber-700" : "text-[#1B4332]"
                    }`}
                  />
                  <span className="text-xs font-bold text-[#111827]">
                    {slot.temp}
                  </span>
                  <span
                    className={`mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium ${
                      slot.alert ? "text-amber-800" : "text-[#4B5563]"
                    }`}
                  >
                    <Droplets className="h-2.5 w-2.5" />
                    {slot.rain}
                  </span>
                </div>
              ))}

              <div className="flex min-w-[72px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-2 py-2 text-center">
                <span className="text-[11px] font-semibold text-[#6B7280]">
                  09:00+
                </span>
                <Lock className="my-1.5 h-3.5 w-3.5 text-[#6B7280]" />
                <span className="text-[10px] font-semibold text-[#1B4332]">
                  Pro
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <p role="alert" className="mt-3 text-xs font-medium text-[#B91C1C]">
          {errorMsg}
        </p>
      )}

      {/* Single Early Access Waitlist CTA */}
      <div className="mt-6">
        {isJoined ? (
          <div className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-50 px-6 py-2.5 text-sm font-semibold text-emerald-900">
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>{t("proTeaser.ctaJoined")}</span>
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
              {isSubmitting ? t("proTeaser.ctaJoining") : t("proTeaser.ctaJoin")}
            </span>
          </button>
        )}
      </div>
    </section>
  )
}
