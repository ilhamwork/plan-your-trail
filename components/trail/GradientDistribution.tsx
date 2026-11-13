"use client"

import { memo, useMemo } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { TrackPoint } from "@/lib/types"
import { formatKmLabel, formatElevationLabel } from "@/lib/format"

interface GradientDistributionProps {
  points: TrackPoint[]
}

/**
 * Classifies a gradient value into three broad terrain types.
 * Thresholds mirror the logic in segment-analysis.ts:
 *   uphill  → gradient > 3%   (includes "uphill" and "climb")
 *   downhill → gradient < -3%  (includes "downhill" and "descent")
 *   flat    → everything in between
 */
function classify(gradient: number): "uphill" | "flat" | "downhill" {
  if (gradient > 3) return "uphill"
  if (gradient < -3) return "downhill"
  return "flat"
}

export const GradientDistribution = memo(function GradientDistribution({ points }: GradientDistributionProps) {
  const { uphillDist, flatDist, downhillDist, total } = useMemo(() => {
    let uphillDist = 0
    let flatDist = 0
    let downhillDist = 0

    // Walk every consecutive pair; the segment length is the distance delta.
    // point.gradient is already computed from smoothed elevation in gpx-parser.ts.
    for (let i = 1; i < points.length; i++) {
      const segDist = points[i].distance - points[i - 1].distance
      if (segDist <= 0) continue

      // Use the gradient value stored on the current point (computed from prev→curr)
      const cat = classify(points[i].gradient)
      if (cat === "uphill") uphillDist += segDist
      else if (cat === "downhill") downhillDist += segDist
      else flatDist += segDist
    }

    const total = uphillDist + flatDist + downhillDist
    return { uphillDist, flatDist, downhillDist, total }
  }, [points])

  const pct = (d: number) => (total > 0 ? Math.round((d / total) * 100) : 0)
  const fmtKm = (m: number) =>
    m >= 1000 ? formatKmLabel(m, 1) : formatElevationLabel(m)

  const categories = [
    {
      key: "uphill",
      label: "Tanjakan (> +3%)",
      distance: uphillDist,
      percentage: pct(uphillDist),
      textColor: "text-[#B91C1C]",
      barColor: "bg-[#E76F51]",
      icon: TrendingUp,
    },
    {
      key: "flat",
      label: "Datar (-3% s/d +3%)",
      distance: flatDist,
      percentage: pct(flatDist),
      textColor: "text-[#1B4332]",
      barColor: "bg-[#1B4332]",
      icon: Minus,
    },
    {
      key: "downhill",
      label: "Turunan (< -3%)",
      distance: downhillDist,
      percentage: pct(downhillDist),
      textColor: "text-[#1E3A8A]",
      barColor: "bg-[#457B9D]",
      icon: TrendingDown,
    },
  ] as const

  return (
    <section aria-label="Sebaran Kemiringan Rute" className="py-1">
      <div>
        <h3 className="text-xl font-bold tracking-tight text-[#111827]">
          Sebaran Kemiringan Rute
        </h3>
        <p className="mt-0.5 text-xs text-[#6B7280]">
          Proporsi medan tanjakan, datar, dan turunan dari titik GPX
        </p>
      </div>

      {/* Stacked terrain proportion bar (AllTrails-style) */}
      <div className="mt-4 flex h-4 gap-1 overflow-hidden rounded-full bg-[#E5E7EB] p-0.5">
        {categories.map((cat) =>
          cat.percentage > 0 ? (
            <div
              key={cat.key}
              title={`${cat.label}: ${cat.percentage}%`}
              className={`${cat.barColor} transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${cat.percentage}%` }}
            />
          ) : null
        )}
      </div>

      {/* Breakdown list matching AllTrails surface type layout */}
      <ul className="mt-4 divide-y divide-[#E5E7EB]">
        {categories.map((cat) => (
          <li
            key={cat.key}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <cat.icon
                className={`h-4 w-4 shrink-0 ${cat.textColor}`}
                aria-hidden="true"
              />
              <span className="truncate text-sm font-medium text-[#374151]">
                {cat.label}
              </span>
            </div>

            <div className="flex shrink-0 items-baseline gap-2.5 tabular-nums">
              <span className="text-xs text-[#6B7280]">
                {fmtKm(cat.distance)}
              </span>
              <span className={`w-12 text-right text-sm font-bold ${cat.textColor}`}>
                {cat.percentage}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
})
