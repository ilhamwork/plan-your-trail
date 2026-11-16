"use client"

import { memo, useMemo } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { TrackPoint } from "@/lib/types"
import { formatKmLabel, formatElevationLabel } from "@/lib/format"
import { useI18n } from "@/lib/i18n/context"
import { TERRAIN_CATEGORY_TOKENS } from "@/lib/terrain-colors"

interface GradientDistributionProps {
  points: TrackPoint[]
}

/**
 * Classifies a gradient value into three broad terrain types.
 * Thresholds mirror the logic in segment-analysis.ts:
 *   uphill   → gradient > 3%   (includes "uphill" and "climb")
 *   downhill → gradient < -3%  (includes "downhill" and "descent")
 *   flat     → everything in between
 */
function classify(gradient: number): "uphill" | "flat" | "downhill" {
  if (gradient > 3) return "uphill"
  if (gradient < -3) return "downhill"
  return "flat"
}

export const GradientDistribution = memo(function GradientDistribution({
  points,
}: GradientDistributionProps) {
  const { t } = useI18n()

  const { uphillDist, flatDist, downhillDist, total } = useMemo(() => {
    let uphillDist = 0
    let flatDist = 0
    let downhillDist = 0

    for (let i = 1; i < points.length; i++) {
      const segDist = points[i].distance - points[i - 1].distance
      if (segDist <= 0) continue

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
      label: t("gradientDist.uphillLabel"),
      distance: uphillDist,
      percentage: pct(uphillDist),
      textColor: TERRAIN_CATEGORY_TOKENS.uphill.text,
      barColor: TERRAIN_CATEGORY_TOKENS.uphill.barBg,
      swatchColor: TERRAIN_CATEGORY_TOKENS.uphill.swatchBg,
      icon: TrendingUp,
    },
    {
      key: "flat",
      label: t("gradientDist.flatLabel"),
      distance: flatDist,
      percentage: pct(flatDist),
      textColor: TERRAIN_CATEGORY_TOKENS.flat.text,
      barColor: TERRAIN_CATEGORY_TOKENS.flat.barBg,
      swatchColor: TERRAIN_CATEGORY_TOKENS.flat.swatchBg,
      icon: Minus,
    },
    {
      key: "downhill",
      label: t("gradientDist.downhillLabel"),
      distance: downhillDist,
      percentage: pct(downhillDist),
      textColor: TERRAIN_CATEGORY_TOKENS.downhill.text,
      barColor: TERRAIN_CATEGORY_TOKENS.downhill.barBg,
      swatchColor: TERRAIN_CATEGORY_TOKENS.downhill.swatchBg,
      icon: TrendingDown,
    },
  ] as const

  return (
    <section aria-label={t("gradientDist.title")} className="py-1">
      <div>
        <h3 className="text-xl font-bold tracking-tight text-[#111827]">
          {t("gradientDist.title")}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-[#4B5563]">
          {t("gradientDist.subtitle")}
        </p>
      </div>

      {/* Stacked terrain proportion bar */}
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

      {/* Breakdown list with unified color key dots */}
      <ul className="mt-4 divide-y divide-[#E5E7EB]">
        {categories.map((cat) => (
          <li
            key={cat.key}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${cat.swatchColor}`}
                aria-hidden="true"
              />
              <cat.icon
                className={`h-4 w-4 shrink-0 ${cat.textColor}`}
                aria-hidden="true"
              />
              <span className="truncate text-sm font-medium text-[#374151]">
                {cat.label}
              </span>
            </div>

            <div className="flex shrink-0 items-baseline gap-2.5 tabular-nums">
              <span className="text-xs font-medium text-[#4B5563]">
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
