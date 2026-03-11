"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TrackPoint } from "@/lib/types";

interface GradientDistributionProps {
  points: TrackPoint[];
}

/**
 * Classifies a gradient value into three broad terrain types.
 * Thresholds mirror the logic in segment-analysis.ts:
 *   uphill  → gradient > 3%   (includes "uphill" and "climb")
 *   downhill → gradient < -3%  (includes "downhill" and "descent")
 *   flat    → everything in between
 */
function classify(gradient: number): "uphill" | "flat" | "downhill" {
  if (gradient > 3) return "uphill";
  if (gradient < -3) return "downhill";
  return "flat";
}

export function GradientDistribution({ points }: GradientDistributionProps) {
  const { uphillDist, flatDist, downhillDist, total } = useMemo(() => {
    let uphillDist = 0;
    let flatDist = 0;
    let downhillDist = 0;

    // Walk every consecutive pair; the segment length is the distance delta.
    // point.gradient is already computed from smoothed elevation in gpx-parser.ts.
    for (let i = 1; i < points.length; i++) {
      const segDist = points[i].distance - points[i - 1].distance;
      if (segDist <= 0) continue;

      // Use the gradient value stored on the current point (computed from prev→curr)
      const cat = classify(points[i].gradient);
      if (cat === "uphill") uphillDist += segDist;
      else if (cat === "downhill") downhillDist += segDist;
      else flatDist += segDist;
    }

    const total = uphillDist + flatDist + downhillDist;
    return { uphillDist, flatDist, downhillDist, total };
  }, [points]);

  const pct = (d: number) => (total > 0 ? Math.round((d / total) * 100) : 0);
  const fmtKm = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

  const categories = [
    {
      key: "uphill",
      label: "Uphill",
      distance: uphillDist,
      percentage: pct(uphillDist),
      textColor: "text-[#E76F51]",
      barColor: "bg-[#E76F51]",
      borderColor: "border-[#E76F51]/20",
      icon: <TrendingUp className="h-4 w-4 text-[#E76F51]" />,
    },
    {
      key: "flat",
      label: "Flat",
      distance: flatDist,
      percentage: pct(flatDist),
      textColor: "text-[#1B4332]",
      barColor: "bg-[#1B4332]",
      borderColor: "border-[#1B4332]/20",
      icon: <Minus className="h-4 w-4 text-[#1B4332]" />,
    },
    {
      key: "downhill",
      label: "Downhill",
      distance: downhillDist,
      percentage: pct(downhillDist),
      textColor: "text-blue-500",
      barColor: "bg-blue-500",
      borderColor: "border-blue-500/20",
      icon: <TrendingDown className="h-4 w-4 text-blue-500" />,
    },
  ] as const;

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-[#E76F51]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="22 7 13 16 8 11 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
          <h3 className="text-sm font-bold text-[#2D3436]">
            Gradient Distribution
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          Terrain breakdown calculated from GPX track points
        </p>
      </div>

      <div className="px-4 py-4">
        {/* Stacked progress bar */}
        <div className="flex h-3 overflow-hidden rounded-full gap-0.5 mb-4">
          {categories.map((cat) =>
            cat.percentage > 0 ? (
              <div
                key={cat.key}
                title={`${cat.label}: ${cat.percentage}%`}
                className={`${cat.barColor} transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${cat.percentage}%` }}
              />
            ) : null
          )}
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <div
              key={cat.key}
              className={`rounded-xl border ${cat.borderColor} bg-gray-50 p-3 flex flex-col gap-1.5`}
            >
              <div className="flex items-center gap-1.5">
                {cat.icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {cat.label}
                </span>
              </div>
              <p className={`text-2xl font-bold leading-none ${cat.textColor}`}>
                {cat.percentage}
                <span className="text-sm font-medium">%</span>
              </p>
              <p className="text-[11px] text-gray-400">{fmtKm(cat.distance)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
