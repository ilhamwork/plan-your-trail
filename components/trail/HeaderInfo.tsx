"use client"

import { memo } from "react"
import { Calendar } from "lucide-react"
import type { RouteStats } from "@/lib/types"
import { MetricsPanel } from "./MetricsPanel"
import { useI18n } from "@/lib/i18n/context"

interface HeaderInfoProps {
  raceName: string
  userName: string
  raceDate: string
  stats?: RouteStats
  waypointCount?: number
  fileName?: string
  actionSlot?: React.ReactNode
  showTitle?: boolean
  showMetrics?: boolean
}

export const HeaderInfo = memo(function HeaderInfo({
  raceName,
  userName,
  raceDate,
  stats,
  waypointCount = 0,
  fileName,
  actionSlot,
  showTitle = true,
  showMetrics = true,
}: HeaderInfoProps) {
  const { t, locale } = useI18n()
  const runnerDisplay = userName?.trim() || t("metrics.guestRunner")

  const formattedDate = raceDate
    ? new Date(raceDate).toLocaleDateString(
        locale === "id" ? "id-ID" : "en-US",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      )
    : t("metrics.runDateUnset")

  return (
    <div className="space-y-6">
      {showTitle && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
            {raceName || (fileName ? fileName.replace(/\.gpx$/i, "") : "Rute Trail")}
          </h1>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#4B5563]">
              <span className="font-medium">
                {t("metrics.createdBy", { name: runnerDisplay })}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-[#1B4332]" aria-hidden="true" />
                <span>{t("metrics.runDateLabel", { date: formattedDate })}</span>
              </span>
            </div>

            {actionSlot && <div className="flex items-center gap-2">{actionSlot}</div>}
          </div>
        </div>
      )}

      {showMetrics && stats && (
        <div className={showTitle ? "border-t border-[#E5E7EB] pt-5" : ""}>
          <MetricsPanel stats={stats} waypointCount={waypointCount} />
        </div>
      )}
    </div>
  )
})
