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
import Image from "next/image"

interface ShareCardProps {
  stats: RouteStats
  points: TrackPoint[]
  raceName: string
  userName: string
  raceDate: string
  shareUrl: string
}

export function ShareCard({
  stats,
  points,
  raceName,
  raceDate,
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

  return (
    <div
      id="share-card-content"
      className="relative w-[1080px] overflow-hidden bg-transparent p-12 font-sans text-white"
    >
      {/* Background - Transparent */}

      <div className="flex flex-col gap-5">
        {/* Title & Date */}
        <div className="flex flex-col items-center space-y-1">
          <h1 className="text-6xl leading-tight font-black tracking-tight">
            {raceName || "Untitled Trail"}
          </h1>
          <p className="text-2xl font-medium tracking-wide opacity-70">
            {formattedDate}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="flex justify-center">
          <div className="flex justify-evenly gap-8">
            <div className="flex flex-col items-center space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tighter">
                  {(stats.totalDistance / 1000).toFixed(0)}
                </span>
                <span className="text-2xl font-bold opacity-70">km</span>
              </div>
              <p className="text-xl font-bold tracking-widest opacity-70">
                distance
              </p>
            </div>

            <div className="flex flex-col items-center space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tighter">
                  {Math.round(stats.elevationGain).toLocaleString("id-ID")}
                </span>
                <span className="text-2xl font-bold opacity-70">m+</span>
              </div>
              <p className="text-xl font-bold tracking-widest opacity-70">
                gain
              </p>
            </div>

            <div className="flex flex-col items-center space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tighter">
                  {(
                    stats.totalDistance / 1000 +
                    stats.elevationGain * 0.01
                  ).toFixed(0)}
                </span>
                <span className="text-2xl font-bold opacity-70">km</span>
              </div>
              <p className="text-xl font-bold tracking-widest opacity-70">
                effort
              </p>
            </div>
          </div>
        </div>

        {/* Elevation Profile */}
        <div className="flex h-40 justify-center">
          <div className="w-1/2">
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
                <YAxis hide domain={["dataMin - 600", "dataMax + 100"]} />
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
                        opacity: 0.7,
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
                        opacity: 0.7,
                      }}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Terrain Breakdown */}
        <div className="flex flex-col items-center space-y-5">
          <div className="flex w-1/2 items-center justify-between gap-12 text-2xl font-bold tracking-tight">
            <div className="flex items-center gap-3">
              <span className="text-3xl text-[#F4A261]">▲</span>
              <span>
                Uphill{" "}
                <span className="ml-1 opacity-70">
                  {gradientDistribution.uphill}%
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl text-[#2A9D8F]">▬</span>
              <span>
                Flat{" "}
                <span className="ml-1 opacity-70">
                  {gradientDistribution.flat}%
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl text-[#457B9D]">▼</span>
              <span>
                Downhill{" "}
                <span className="ml-1 opacity-70">
                  {gradientDistribution.downhill}%
                </span>
              </span>
            </div>
          </div>

          {/* Distribution Bar */}
          <div className="flex h-4 w-1/2 justify-center overflow-hidden rounded-full bg-white/10">
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
        <div className="mt-10 flex justify-center">
          <span className="text-3xl font-medium tracking-tighter">
            planyourtrail.run
          </span>
          {/* <Image
            src="/text-logo-white.png"
            alt="Text Logo"
            width={320}
            height={80}
          /> */}
        </div>
      </div>
    </div>
  )
}
