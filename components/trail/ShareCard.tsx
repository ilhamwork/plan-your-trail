"use client"

import { useMemo } from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  ReferenceDot,
} from "recharts"
import type { RouteStats, TrackPoint } from "@/lib/types"

export type AspectRatio = "9:16" | "4:5"

interface ShareCardProps {
  stats: RouteStats
  points: TrackPoint[]
  raceName: string
  userName: string
  raceDate: string
  ratio: AspectRatio
  shareUrl: string
}

export function ShareCard({
  stats,
  points,
  raceName,
  raceDate,
  ratio,
}: ShareCardProps) {
  // Downsample points for the chart
  const chartData = useMemo(() => {
    return points
      .filter((_, i) => i % Math.max(1, Math.floor(points.length / 100)) === 0)
      .map((p) => ({
        distance: p.distance / 1000,
        elevation: p.ele,
      }))
  }, [points])

  // Elevation extremes
  const extremes = useMemo(() => {
    if (chartData.length === 0) return null
    let highest = chartData[0]
    let lowest = chartData[0]

    for (const p of chartData) {
      if (p.elevation > highest.elevation) highest = p
      if (p.elevation < lowest.elevation) lowest = p
    }

    return { highest, lowest }
  }, [chartData])

  // Gradient Distribution Logic
  const gradientDistribution = useMemo(() => {
    let uphillDist = 0
    let flatDist = 0
    let downhillDist = 0

    for (let i = 1; i < points.length; i++) {
      const segDist = points[i].distance - points[i - 1].distance
      if (segDist <= 0) continue

      const g = points[i].gradient
      if (g > 3) uphillDist += segDist
      else if (g < -3) downhillDist += segDist
      else flatDist += segDist
    }

    const total = uphillDist + flatDist + downhillDist
    return {
      uphill: Math.round((uphillDist / total) * 100),
      flat: Math.round((flatDist / total) * 100),
      downhill: Math.round((downhillDist / total) * 100),
    }
  }, [points])

  const formattedDate = useMemo(() => {
    return raceDate
      ? new Date(raceDate).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : ""
  }, [raceDate])

  const dimensions = {
    "9:16": { width: 1080, height: 1920 },
    "4:5": { width: 1080, height: 1350 },
  }[ratio]

  return (
    <div
      id={`share-card-${ratio.replace(":", "-")}`}
      className="relative overflow-hidden bg-transparent font-sans text-white"
      style={{
        width: dimensions.width,
        height: dimensions.height,
      }}
    >
      {/* Background - Transparent */}

      {/* Main Content */}
      <div className="absolute right-12 bottom-40 left-12 z-20 flex flex-col gap-10">
        {/* Title & Date */}
        <div className="flex flex-col items-center space-y-1">
          <h1 className="text-6xl leading-tight font-black tracking-tight">
            {raceName || "Untitled Trail"}
          </h1>
          <p className="text-2xl font-medium tracking-wide opacity-60">
            {formattedDate}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="flex justify-evenly gap-8 py-4">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black tracking-tighter">
                {(stats.totalDistance / 1000).toFixed(0)}
              </span>
              <span className="text-2xl font-bold opacity-60">km</span>
            </div>
            <p className="text-xl font-bold tracking-widest opacity-40">
              distance
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black tracking-tighter">
                {Math.round(stats.elevationGain).toLocaleString("id-ID")}
              </span>
              <span className="text-2xl font-bold opacity-60">m+</span>
            </div>
            <p className="text-xl font-bold tracking-widest opacity-40">
              elevation gain
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black tracking-tighter">
                {(
                  stats.totalDistance / 1000 +
                  stats.elevationGain * 0.01
                ).toFixed(0)}
              </span>
              <span className="text-2xl font-bold opacity-60">km</span>
            </div>
            <p className="text-xl font-bold tracking-widest opacity-40">
              total effort
            </p>
          </div>
        </div>

        {/* Elevation Profile */}
        <div className="mt-4 flex h-32 justify-center">
          <div className="w-10/12">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              >
                <XAxis
                  hide
                  dataKey="distance"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                />
                <YAxis hide domain={["dataMin - 500", "dataMax + 100"]} />
                <Area
                  type="monotone"
                  dataKey="elevation"
                  stroke="#FFFFFF"
                  strokeWidth={3}
                  fill="transparent"
                  isAnimationActive={false}
                />
                {extremes && (
                  <>
                    <ReferenceDot
                      x={extremes.highest.distance}
                      y={extremes.highest.elevation}
                      r={0}
                      label={{
                        value: `${Math.round(extremes.highest.elevation)}m`,
                        position: "top",
                        fill: "white",
                        fontSize: 24,
                        fontWeight: "bold",
                        opacity: 0.6,
                      }}
                    />
                    <ReferenceDot
                      x={extremes.lowest.distance}
                      y={extremes.lowest.elevation}
                      r={0}
                      label={{
                        value: `${Math.round(extremes.lowest.elevation)}m`,
                        position: "bottom",
                        fill: "white",
                        fontSize: 24,
                        fontWeight: "bold",
                        opacity: 0.6,
                      }}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Terrain Breakdown */}
        <div className="mt-4 flex flex-col items-center space-y-6">
          <div className="flex w-10/12 items-center justify-between gap-12 text-2xl font-bold tracking-tight">
            <div className="flex items-center gap-3">
              <span className="text-3xl text-[#F4A261]">▲</span>
              <span>
                Uphill{" "}
                <span className="ml-1 opacity-40">
                  {gradientDistribution.uphill}%
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl text-[#2A9D8F]">▬</span>
              <span>
                Flat{" "}
                <span className="ml-1 opacity-40">
                  {gradientDistribution.flat}%
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl text-[#457B9D]">▼</span>
              <span>
                Downhill{" "}
                <span className="ml-1 opacity-40">
                  {gradientDistribution.downhill}%
                </span>
              </span>
            </div>
          </div>

          {/* Minimal Distribution Bar */}
          <div className="flex h-4 w-10/12 justify-center overflow-hidden rounded-full bg-white/10">
            <div
              style={{ width: `${gradientDistribution.uphill}%` }}
              className="bg-[#F4A261]/80"
            />
            <div
              style={{ width: `${gradientDistribution.flat}%` }}
              className="bg-[#2A9D8F]/80"
            />
            <div
              style={{ width: `${gradientDistribution.downhill}%` }}
              className="bg-[#457B9D]/80"
            />
          </div>
        </div>

        {/* Branding Overlay */}
        <div className="mt-20 flex justify-center">
          <span className="text-5xl font-black tracking-tighter opacity-80">
            www.planyourtrail.run
          </span>
        </div>
      </div>
    </div>
  )
}
