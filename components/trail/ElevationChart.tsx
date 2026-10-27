"use client"

import { memo, useCallback, useMemo, useRef } from "react"
import Link from "next/link"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts"
import type { TrackPoint, Waypoint } from "@/lib/types"
import { BarChart3, Lock } from "lucide-react"
import { useEntitlements } from "@/lib/entitlements"

interface ElevationChartProps {
  trackPoints: TrackPoint[]
  waypoints: Waypoint[]
  onHover: (point: TrackPoint | null) => void
}

export const ElevationChart = memo(function ElevationChart({
  trackPoints,
  waypoints = [],
  onHover,
}: ElevationChartProps) {
  const lastHoveredIdxRef = useRef<number | string | null>(null)
  const { can } = useEntitlements()
  const canShowGpxWaypoints = can("waypoint_gpx_chart")

  // Downsample points for chart performance and stabilize reference
  const chartData = useMemo(() => {
    const sampleRate = Math.max(1, Math.floor(trackPoints.length / 500))
    return trackPoints
      .filter((_, index) => index % sampleRate === 0)
      .map((point) => ({
        distance: point.distance / 1000,
        elevation: Math.round(point.ele),
        gradient: Math.round(point.gradient * 10) / 10,
        original: point,
      }))
  }, [trackPoints])

  const handleMouseMove = useCallback(
    (data: { activeTooltipIndex?: number | string | null }) => {
      const idx = data?.activeTooltipIndex
      if (idx != null && idx !== lastHoveredIdxRef.current) {
        lastHoveredIdxRef.current = idx
        const point = chartData[Number(idx)]?.original
        if (point) {
          onHover?.(point)
        }
      }
    },
    [onHover, chartData]
  )

  const handleMouseLeave = useCallback(() => {
    if (lastHoveredIdxRef.current !== null) {
      lastHoveredIdxRef.current = null
      onHover?.(null)
    }
  }, [onHover])

  const getElevationAtDistance = useCallback(
    (distanceKm: number) => {
      const point = chartData.find((d) => d.distance >= distanceKm)
      return point
        ? point.elevation
        : chartData[chartData.length - 1]?.elevation
    },
    [chartData]
  )

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#F4A261]" />
            <h3 className="text-sm font-bold text-[#2D3436]">
              Profil Elevasi
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            Geser kursor untuk melihat elevasi dan lokasi pada peta
          </p>
        </div>

        {waypoints.length > 0 && !canShowGpxWaypoints && (
          <Link
            href="/login"
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100"
          >
            <Lock className="h-2.5 w-2.5" />
            <span>Masuk untuk melihat {waypoints.length} waypoint di chart</span>
          </Link>
        )}
      </div>

      <div className="touch-none p-3">
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart
            data={chartData}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchMove={handleMouseMove}
            margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="elevationGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="50%" stopColor="#1B4332" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1B4332" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="distance"
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              tickFormatter={(v: number) => `${v.toFixed(1)} km`}
              axisLine={{ stroke: "#E5E7EB" }}
              tickLine={false}
              type="number"
              domain={["dataMin", "dataMax"]}
            />

            <YAxis
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              tickFormatter={(v: number) => `${v}`}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              domain={["dataMin", "dataMax"]}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const data = payload[0].payload
                return (
                  <div className="pointer-events-none rounded-lg bg-[#2D3436] px-3 py-2 text-xs text-white shadow-lg">
                    <p>Jarak: {data.distance.toFixed(1)} km</p>
                    <p>Elevasi: {data.elevation} m</p>
                    <p>Gradien: {data.gradient.toFixed(0)}%</p>
                  </div>
                )
              }}
              animationDuration={100}
            />

            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#1B4332"
              strokeWidth={2}
              fill="url(#elevationGradient)"
              animationDuration={1000}
              isAnimationActive={false}
            />

            {canShowGpxWaypoints &&
              waypoints.map((wp, i) => {
                const x = wp.distance / 1000
                const y = getElevationAtDistance(x)

                return (
                  <ReferenceDot
                    key={wp.id || i}
                    x={x}
                    y={y}
                    r={5}
                    fill="#E76F51"
                    stroke="white"
                    strokeWidth={2}
                    label={{
                      // value: wp.name,
                      position: "top",
                      fontSize: 10,
                      fill: "#E76F51",
                      offset: 6,
                    }}
                  />
                )
              })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})
