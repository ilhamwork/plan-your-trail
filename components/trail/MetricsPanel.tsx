"use client"

import { memo } from "react"
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
  const { t } = useI18n()

  const avgElevation =
    stats.averageElevation ??
    Math.round((stats.highestPoint + stats.lowestPoint) / 2)

  // Reason (R-04, R-14, R-31): Single-row amenity-list pattern ("What this place offers" reference)
  // lets runners scan all 7 trail telemetry values vertically in one pass without boxed-card clutter.
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
      label: "Total Effort (KM-Effort)",
      value: `${(stats.totalDistance / 1000 + stats.elevationGain * 0.01).toFixed(1)} km`,
    },
    {
      id: "elevGain",
      icon: TrendingUp,
      label: t("metrics.elevGain"),
      value: `+${stats.elevationGain.toLocaleString("id-ID")} m`,
    },
    {
      id: "elevLoss",
      icon: TrendingDown,
      label: t("metrics.elevLoss"),
      value: `-${stats.elevationLoss.toLocaleString("id-ID")} m`,
    },
    {
      id: "highest",
      icon: Mountain,
      label: t("metrics.maxElev"),
      value: `${stats.highestPoint.toLocaleString("id-ID")} m`,
    },
    {
      id: "lowest",
      icon: ArrowDownToLine,
      label: t("metrics.minElev"),
      value: `${stats.lowestPoint.toLocaleString("id-ID")} m`,
    },
    {
      id: "avgElev",
      icon: Activity,
      label: t("metrics.avgElev"),
      value: `${avgElevation.toLocaleString("id-ID")} m`,
    },
    ...(waypointCount > 0
      ? [
          {
            id: "waypoints",
            icon: MapPin,
            label: "Pos & Waypoint",
            value: `${waypointCount} pos`,
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
            <div className="flex min-w-0 items-center gap-3.5">
              <row.icon
                className="h-5 w-5 shrink-0 text-[#1B4332] stroke-[1.75]"
                aria-hidden="true"
              />
              <span className="truncate text-sm font-medium text-[#374151]">
                {row.label}
              </span>
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
