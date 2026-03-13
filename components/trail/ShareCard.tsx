"use client"

import { useMemo } from "react"
import {
  Mountain,
  TrendingUp,
  Flag,
  Map,
  TrendingDown,
  Minus,
} from "lucide-react"
import {
  Area,
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { QRCodeSVG } from "qrcode.react"
import type { RouteStats, TrackPoint } from "@/lib/types"
import Image from "next/image"

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
  userName,
  raceDate,
  ratio,
  shareUrl,
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

  // Gradient Distribution Logic
  const gradientData = useMemo(() => {
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
    return [
      {
        label: "Uphill",
        pct: Math.round((uphillDist / total) * 100),
        color: "#F4A261",
      },
      {
        label: "Flat",
        pct: Math.round((flatDist / total) * 100),
        color: "#2A9D8F",
      },
      {
        label: "Downhill",
        pct: Math.round((downhillDist / total) * 100),
        color: "#457B9D",
      },
    ].filter((d) => d.pct > 0)
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
    "9:16": "w-[1080px] h-[1920px]",
    "4:5": "w-[1080px] h-[1350px]",
  }[ratio]

  // Scale factor for the large original resolution (exports at 1080px wide)
  // We'll design at full resolution to ensure crispness
  return (
    <div
      id={`share-card-${ratio.replace(":", "-")}`}
      className={`flex flex-col bg-[#FAF6F1] font-sans text-[#2D3436] ${dimensions}`}
      style={{
        // Force the size for the html-to-image capture
        width: 1080,
        height: ratio === "9:16" ? 1920 : 1350,
      }}
    >
      {/* Header / Branding */}
      <div className="flex h-40 items-center justify-between bg-[#1B4332] px-16 py-8 text-white">
        <div className="flex items-center gap-6">
          <Image src="/logo.png" alt="Logo" width={40} height={40} />
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              Plan Your Trail
            </h1>
            <p className="text-sm font-bold tracking-[0.3em] opacity-60">
              GPX Route Analysis
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col px-16 py-8">
        {/* Race Info */}
        <div className="relative z-10 mb-10 space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-5xl leading-tight font-black text-[#1B4332]">
              {raceName || "Unnamed Trail"}
            </h2>
          </div>
          <div className="flex items-center gap-8 text-2xl font-bold text-gray-500">
            <span className="tracking-widest">{formattedDate}</span>
          </div>
        </div>

        {/* Metrics Section */}
        <div className="grid grid-cols-3 gap-8 pb-12">
          {[
            {
              label: "Distance",
              value: (stats.totalDistance / 1000).toFixed(2),
              unit: "km",
              color: "#2A9D8F",
            },
            {
              label: "Elevation Gain",
              value: Math.round(stats.elevationGain),
              unit: "m",
              color: "#F4A261",
            },
            {
              label: "Total Effort",
              value: (
                stats.totalDistance / 1000 +
                stats.elevationGain * 0.01
              ).toFixed(1),
              unit: "km",
              color: "#E9C46A",
            },
          ].map((m, i) => (
            <div
              key={i}
              className="rounded-[40px] border border-gray-100 bg-white p-10 shadow-xl"
            >
              <p className="mb-4 text-xl font-bold tracking-[0.2em] text-gray-400">
                {m.label}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-7xl font-black" style={{ color: m.color }}>
                  {m.value}
                  {m.unit && (
                    <span className="ml-2 text-2xl opacity-40">{m.unit}</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Content based on ratio */}
        <div
          className={`flex gap-12 ${ratio === "9:16" ? "flex-col" : "flex-1"}`}
        >
          {/* Elevation Profile */}
          <div
            className={`flex flex-col rounded-[40px] border border-gray-100 bg-white p-10 shadow-xl ${ratio === "9:16" ? "h-[500px]" : "h-full flex-1"}`}
          >
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xl font-bold tracking-[0.2em] text-gray-400">
                Elevation Profile
              </p>
            </div>
            <div className="relative flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient
                      id={`grad-${ratio}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#1B4332" stopOpacity={0.4} />
                      <stop
                        offset="95%"
                        stopColor="#1B4332"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="elevation"
                    stroke="#1B4332"
                    strokeWidth={8}
                    fill={`url(#grad-${ratio})`}
                    isAnimationActive={false}
                  />
                  <XAxis
                    hide
                    type="number"
                    dataKey="distance"
                    domain={["dataMin", "dataMax"]}
                  />
                  <YAxis hide domain={["dataMin - 50", "dataMax + 50"]} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="absolute inset-x-0 bottom-0 flex justify-between border-t border-gray-100 pt-4 text-lg font-bold tracking-widest text-gray-400">
                <span>Start</span>
                <span>Finish</span>
              </div>
            </div>
          </div>

          {/* Terrain Breakdown - Pie Chart */}
          <div
            className={`flex flex-col rounded-[40px] border border-gray-100 bg-white p-10 shadow-xl ${
              ratio === "9:16" ? "h-auto" : "w-[360px]"
            }`}
          >
            <p className="mb-8 text-xl font-bold tracking-[0.2em] text-gray-400">
              Gradient Distribution
            </p>
            <div
              className={`flex items-center gap-6 ${
                ratio === "9:16"
                  ? "flex-row justify-between"
                  : "flex-col justify-center"
              }`}
            >
              <div
                className={`${ratio === "9:16" ? "h-64 w-64" : "h-56 w-56"} shrink-0`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gradientData}
                      cx="50%"
                      cy="50%"
                      innerRadius={ratio === "9:16" ? 65 : 55}
                      outerRadius={ratio === "9:16" ? 95 : 85}
                      paddingAngle={4}
                      dataKey="pct"
                      isAnimationActive={false}
                    >
                      {gradientData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend Overlay */}
              <div
                className={`${ratio === "9:16" ? "w-1/2" : "w-full"} space-y-3`}
              >
                {gradientData.map((d, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between font-bold ${
                      ratio === "9:16" ? "text-2xl" : "text-xl"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-gray-500">{d.label}</span>
                    </span>
                    <span className="text-[#1B4332]">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {ratio === "9:16" && <div className="flex-1" />}

        {/* Footer Area with QR */}
        <div className="mt-12 flex h-48 items-center gap-12 rounded-[40px] bg-[#1B4332] p-8 text-white">
          <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-white p-3">
            <QRCodeSVG
              value={shareUrl}
              size={120}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: "/logo.png",
                x: undefined,
                y: undefined,
                height: 24,
                width: 24,
                excavate: true,
              }}
            />
          </div>
          <div className="flex-1">
            <p className="text-3xl font-black tracking-tight">
              Scan to View More Report
            </p>
            <p className="mt-1 text-xl font-medium opacity-60">
              Full route details, segments breakdown, and weather prediction.
            </p>
          </div>
          <div className="pr-4 text-right">
            <p className="text-lg font-bold tracking-[0.3em] opacity-40">
              planyourtrail.run
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
