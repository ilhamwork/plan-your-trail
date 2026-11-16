"use client"

import { memo, useEffect, useId, useRef, useState } from "react"
import type { RouteStats } from "@/lib/types"
import {
  Route,
  Zap,
  TrendingUp,
  TrendingDown,
  Mountain,
  ArrowDownToLine,
  Activity,
  MapPin,
  Info,
} from "lucide-react"
import { formatKm } from "@/lib/format"
import { useI18n } from "@/lib/i18n/context"

interface MetricsPanelProps {
  stats: RouteStats
  waypointCount?: number
}

export const MetricsPanel = memo(function MetricsPanel({
  stats,
  waypointCount = 0,
}: MetricsPanelProps) {
  const { t, locale } = useI18n()
  const [showEffortInfo, setShowEffortInfo] = useState(false)
  const effortTooltipId = useId()
  const effortContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showEffortInfo) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowEffortInfo(false)
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (
        effortContainerRef.current &&
        !effortContainerRef.current.contains(e.target as Node)
      ) {
        setShowEffortInfo(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showEffortInfo])

  const numLocale = locale === "id" ? "id-ID" : "en-US"
  const avgElevation =
    stats.averageElevation ??
    Math.round((stats.highestPoint + stats.lowestPoint) / 2)

  const rows = [
    {
      id: "distance",
      icon: Route,
      label: t("metrics.distance"),
      value: `${formatKm(stats.totalDistance)} km`,
    },
    {
      id: "effort",
      icon: Zap,
      label: t("metrics.kmEffortLabel"),
      value: `${(stats.totalDistance / 1000 + stats.elevationGain * 0.01).toFixed(1)} km`,
      hasEffortInfo: true,
    },
    {
      id: "elevGain",
      icon: TrendingUp,
      label: t("metrics.elevGain"),
      value: `+${stats.elevationGain.toLocaleString(numLocale)} m`,
    },
    {
      id: "elevLoss",
      icon: TrendingDown,
      label: t("metrics.elevLoss"),
      value: `-${stats.elevationLoss.toLocaleString(numLocale)} m`,
    },
    {
      id: "highest",
      icon: Mountain,
      label: t("metrics.maxElev"),
      value: `${stats.highestPoint.toLocaleString(numLocale)} m`,
    },
    {
      id: "lowest",
      icon: ArrowDownToLine,
      label: t("metrics.minElev"),
      value: `${stats.lowestPoint.toLocaleString(numLocale)} m`,
    },
    {
      id: "avgElev",
      icon: Activity,
      label: t("metrics.avgElev"),
      value: `${avgElevation.toLocaleString(numLocale)} m`,
    },
    ...(waypointCount > 0
      ? [
          {
            id: "waypoints",
            icon: MapPin,
            label: t("metrics.waypointsLabel"),
            value: t("metrics.waypointsCount", { count: waypointCount }),
          },
        ]
      : []),
  ]

  return (
    <section aria-label={t("metrics.title")} className="py-2">
      <h3 className="text-xl font-bold tracking-tight text-[#111827]">
        {t("metrics.title")}
      </h3>

      <ul className="mt-4 divide-y divide-[#E5E7EB]">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-4 py-3.5"
          >
            <div
              ref={row.hasEffortInfo ? effortContainerRef : undefined}
              className="relative flex min-w-0 items-center gap-3.5"
            >
              <row.icon
                className="h-5 w-5 shrink-0 text-[#1B4332] stroke-[1.75]"
                aria-hidden="true"
              />
              <span className="truncate text-sm font-medium text-[#374151]">
                {row.label}
              </span>

              {row.hasEffortInfo && (
                <>
                  <button
                    type="button"
                    aria-label={t("metrics.kmEffortInfoAria")}
                    aria-expanded={showEffortInfo}
                    aria-controls={effortTooltipId}
                    onClick={() => setShowEffortInfo((prev) => !prev)}
                    className="-my-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-[#4B5563] transition hover:bg-[#F1EDE8] hover:text-[#1B4332] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
                  >
                    <Info className="h-4 w-4" aria-hidden="true" />
                  </button>

                  {showEffortInfo && (
                    <div
                      id={effortTooltipId}
                      role="region"
                      aria-label={t("metrics.kmEffortInfoAria")}
                      className="absolute top-full left-0 z-30 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-[#E5E7EB] bg-white p-3.5 text-xs leading-relaxed text-[#374151] shadow-lg"
                    >
                      {t("metrics.kmEffortTooltip")}
                    </div>
                  )}
                </>
              )}
            </div>

            <span className="shrink-0 text-sm font-bold tracking-tight text-[#111827] tabular-nums">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
})
