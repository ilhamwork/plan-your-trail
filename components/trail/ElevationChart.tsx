"use client"

import { useCallback, useMemo } from "react"
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
import { BarChart3 } from "lucide-react"

interface ElevationChartProps {
  trackPoints: TrackPoint[]
  waypoints: Waypoint[]
  onHover: (point: TrackPoint | null) => void
}

interface ChartDataPoint {
  distance: number
  elevation: number
  gradient: number
  original: TrackPoint
}

export function ElevationChart({
  trackPoints,
  waypoints = [],
  onHover,
}: ElevationChartProps) {
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
    (data: any) => {
      if (data && data.activeTooltipIndex !== undefined) {
        const point = chartData[data.activeTooltipIndex]?.original
        if (point) {
          onHover?.(point)
        }
      }
    },
    [onHover, chartData]
  )

  const handleMouseLeave = useCallback(() => {
    onHover?.(null)
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
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#F4A261]" />
          <h3 className="text-sm font-bold text-[#2D3436]">
            Elevation Profile
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          Hover over the chart to see details on the map
        </p>
      </div>

      <div className="p-3">
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart
            data={chartData}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
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
              tickFormatter={(v: number) => `${v.toFixed(0)} km`}
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
                    <p>Distance: {data.distance.toFixed(0)} km</p>
                    <p>Altitude: {data.elevation} m</p>
                    <p>Gradient: {data.gradient.toFixed(0)}%</p>
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

            {waypoints.map((wp, i) => {
              const x = wp.distance / 1000
              const y = getElevationAtDistance(x)

              return (
                <ReferenceDot
                  key={i}
                  x={x}
                  y={y}
                  r={5}
                  fill="#E76F51"
                  stroke="white"
                  strokeWidth={2}
                  label={{
                    position: "top",
                    fontSize: 10,
                  }}
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
