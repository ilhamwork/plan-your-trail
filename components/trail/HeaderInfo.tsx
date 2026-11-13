"use client"

import { memo } from "react"
import { Calendar } from "lucide-react"
import type { RouteStats } from "@/lib/types"
import { MetricsPanel } from "./MetricsPanel"

interface HeaderInfoProps {
  raceName: string
  userName: string
  raceDate: string
  stats?: RouteStats
  waypointCount?: number
  fileName?: string
  actionSlot?: React.ReactNode
}

export const HeaderInfo = memo(function HeaderInfo({
  raceName,
  userName,
  raceDate,
  stats,
  waypointCount = 0,
  fileName,
  actionSlot,
}: HeaderInfoProps) {
  const runnerDisplay = userName?.trim() || "Pelari Tamu"
  const runnerInitial = runnerDisplay.charAt(0).toUpperCase()

  const formattedDate = raceDate
    ? new Date(raceDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Tanggal race belum ditentukan"

  return (
    <div className="space-y-6">
      {/* Title & Trail Meta Header (AllTrails Style) */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
          {raceName || (fileName ? fileName.replace(/\.gpx$/i, "") : "Rute Trail")}
        </h1>

        {/* Runner & Date Badge Line */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B4332] text-xs font-bold text-[#FAF6F1]"
            >
              {runnerInitial}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 text-xs text-[#4B5563]">
              <span className="font-semibold text-[#111827]">
                {runnerDisplay}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-[#1B4332]" />
                {formattedDate}
              </span>
            </div>
          </div>

          {actionSlot && <div className="flex items-center gap-2">{actionSlot}</div>}
        </div>
      </div>

      {/* Detailed Amenities & Full Telemetry List (Route Summary) */}
      {stats && (
        <div className="border-t border-[#E5E7EB] pt-5">
          <MetricsPanel stats={stats} waypointCount={waypointCount} />
        </div>
      )}
    </div>
  )
})
