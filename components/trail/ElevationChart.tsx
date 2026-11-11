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
  ReferenceArea,
  ReferenceLine,
} from "recharts"
import type {
  TrackPoint,
  Waypoint,
  RouteStats,
  HighlightRange,
} from "@/lib/types"
import { BarChart3, Lock, MapPin, RotateCcw } from "lucide-react"
import { useEntitlements } from "@/lib/entitlements"

interface ElevationChartProps {
  trackPoints: TrackPoint[]
  waypoints: Waypoint[]
  onHover: (point: TrackPoint | null) => void
  stats?: RouteStats
  routeName?: string
  hoveredPoint?: TrackPoint | null
  highlightRange?: HighlightRange | null
  onClearHighlight?: () => void
  embedded?: boolean
  className?: string
  showSubHeader?: boolean
}

export const ElevationChart = memo(function ElevationChart({
  trackPoints,
  waypoints = [],
  onHover,
  stats,
  routeName,
  hoveredPoint,
  highlightRange,
  onClearHighlight,
  embedded = false,
  className = "",
  showSubHeader = true,
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

  // Derive fallback route summary if stats prop is not explicitly provided
  const computedSummary = useMemo(() => {
    if (stats) {
      return {
        totalDistanceKm: stats.totalDistance / 1000,
        elevationGainM: Math.round(stats.elevationGain),
      }
    }
    if (trackPoints.length === 0) {
      return { totalDistanceKm: 0, elevationGainM: 0 }
    }
    const lastPt = trackPoints[trackPoints.length - 1]
    let gain = 0
    for (let i = 1; i < trackPoints.length; i++) {
      const diff = trackPoints[i].ele - trackPoints[i - 1].ele
      if (diff > 0) gain += diff
    }
    return {
      totalDistanceKm: lastPt.distance / 1000,
      elevationGainM: Math.round(gain),
    }
  }, [stats, trackPoints])

  // Derive highlighted segment metrics when a segment is selected
  const highlightedSegmentMetrics = useMemo(() => {
    if (!highlightRange || trackPoints.length === 0) return null
    const startIdx = Math.max(0, highlightRange.startIndex)
    const endIdx = Math.min(trackPoints.length - 1, highlightRange.endIndex)
    if (endIdx <= startIdx) return null

    const startPt = trackPoints[startIdx]
    const endPt = trackPoints[endIdx]
    let segGain = 0
    for (let i = startIdx + 1; i <= endIdx; i++) {
      const diff = trackPoints[i].ele - trackPoints[i - 1].ele
      if (diff > 0) segGain += diff
    }

    return {
      startKm: startPt.distance / 1000,
      endKm: endPt.distance / 1000,
      distanceKm: (endPt.distance - startPt.distance) / 1000,
      elevationGainM: Math.round(segGain),
    }
  }, [highlightRange, trackPoints])

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

  // Determine values displayed in the two primary telemetry columns
  const distanceLabel = hoveredPoint
    ? "Jarak di Titik Ini"
    : highlightedSegmentMetrics
      ? "Panjang Segmen"
      : "Panjang Rute"

  const distanceValue = hoveredPoint
    ? `${(hoveredPoint.distance / 1000).toFixed(2)} km`
    : highlightedSegmentMetrics
      ? `${highlightedSegmentMetrics.distanceKm.toFixed(2)} km`
      : `${computedSummary.totalDistanceKm.toFixed(1)} km`

  const elevationLabel = hoveredPoint
    ? "Elevasi & Kemiringan"
    : highlightedSegmentMetrics
      ? "Elevasi Naik Segmen"
      : "Elevasi Naik (D+)"

  const elevationValue = hoveredPoint
    ? `${Math.round(hoveredPoint.ele)} m`
    : highlightedSegmentMetrics
      ? `+${highlightedSegmentMetrics.elevationGainM.toLocaleString("id-ID")} m`
      : `+${computedSummary.elevationGainM.toLocaleString("id-ID")} m`

  const hoveredGradientText = hoveredPoint
    ? `${hoveredPoint.gradient > 0 ? "+" : ""}${hoveredPoint.gradient.toFixed(1)}%`
    : null

  return (
    <div
      className={
        embedded
          ? className
          : `overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm ${className}`
      }
    >
      {showSubHeader && (
        <div className="px-4 pt-3 pb-1 sm:px-6">
          {/* Sheet Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                {!embedded && <BarChart3 className="h-4 w-4 text-[#E76F51]" />}
                <h3 className="heading-3 text-[#2D3436]">
                  {highlightedSegmentMetrics
                    ? `Segmen KM ${highlightedSegmentMetrics.startKm.toFixed(1)} - ${highlightedSegmentMetrics.endKm.toFixed(1)}`
                    : routeName || "Profil Elevasi Rute"}
                </h3>
              </div>
              <p className="mt-0.5 body-sm text-[#4B5563]">
                Geser pada grafik untuk melacak titik lokasi dan kemiringan di peta
              </p>
            </div>

            <div className="flex items-center gap-2">
              {highlightedSegmentMetrics && onClearHighlight && (
                <button
                  type="button"
                  onClick={onClearHighlight}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[#D1D5DB] bg-[#FAF6F1] px-3 py-1 text-xs font-semibold text-[#2D3436] transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1]"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Semua Rute</span>
                </button>
              )}

              {waypoints.length > 0 && !canShowGpxWaypoints && (
                <Link
                  href="/login"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-200"
                >
                  <Lock className="h-3 w-3" />
                  <span>Masuk untuk melihat {waypoints.length} waypoint</span>
                </Link>
              )}

              {waypoints.length > 0 && canShowGpxWaypoints && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F1EDE8] px-2.5 py-1 text-xs font-semibold text-[#1B4332]">
                  <MapPin className="h-3 w-3 text-[#E76F51]" />
                  <span>{waypoints.length} Pos</span>
                </span>
              )}
            </div>
          </div>

          {/* Primary Dual Telemetry Readout (Reference-inspired Length & Elevation Gain) */}
          <div className="mt-3 grid grid-cols-2 gap-4 border-t border-[#F1EDE8] pt-3">
            <div>
              <p className="body-sm-medium text-[#4B5563]">{distanceLabel}</p>
              <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-[#2D3436] tabular-nums sm:text-3xl">
                {distanceValue}
              </p>
            </div>

            <div className="text-right">
              <p className="body-sm-medium text-[#4B5563]">{elevationLabel}</p>
              <div className="mt-0.5 flex items-baseline justify-end gap-2">
                <p className="text-2xl font-extrabold tracking-tight text-[#1B4332] tabular-nums sm:text-3xl">
                  {elevationValue}
                </p>
                {hoveredGradientText && (
                  <span className="rounded-md bg-[#F1EDE8] px-1.5 py-0.5 text-xs font-bold text-[#2D3436] tabular-nums">
                    {hoveredGradientText}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="touch-none px-2 pt-1 pb-3 sm:px-4">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart
            data={chartData}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchMove={handleMouseMove}
            margin={{ top: 14, right: 12, left: -16, bottom: 2 }}
          >
            <defs>
              <linearGradient
                id="elevationGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="15%" stopColor="#1B4332" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#1B4332" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="distance"
              tick={{ fontSize: 11, fill: "#4B5563", fontWeight: 500 }}
              tickFormatter={(v: number) => `${v.toFixed(1)} km`}
              axisLine={{ stroke: "#E5E7EB" }}
              tickLine={false}
              type="number"
              domain={["dataMin", "dataMax"]}
              minTickGap={28}
            />

            <YAxis
              tick={{ fontSize: 10, fill: "#4B5563" }}
              tickFormatter={(v: number) => `${v}m`}
              tickLine={false}
              axisLine={false}
              domain={["dataMin", "dataMax"]}
              width={48}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const data = payload[0].payload
                return (
                  <div className="pointer-events-none rounded-lg bg-[#2D3436] px-3 py-2 text-xs text-white shadow-lg tabular-nums">
                    <p className="font-semibold">Jarak: {data.distance.toFixed(2)} km</p>
                    <p>Elevasi: {data.elevation} m</p>
                    <p>Gradien: {data.gradient > 0 ? "+" : ""}{data.gradient.toFixed(1)}%</p>
                  </div>
                )
              }}
              animationDuration={80}
            />

            {highlightedSegmentMetrics && (
              <ReferenceArea
                x1={highlightedSegmentMetrics.startKm}
                x2={highlightedSegmentMetrics.endKm}
                fill="#E76F51"
                fillOpacity={0.22}
                stroke="#E76F51"
                strokeOpacity={0.5}
              />
            )}

            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#1B4332"
              strokeWidth={2.5}
              fill="url(#elevationGradient)"
              animationDuration={800}
              isAnimationActive={false}
            />

            {canShowGpxWaypoints &&
              waypoints.map((wp, i) => {
                const x = wp.distance / 1000

                return (
                  <ReferenceLine
                    key={`line-${wp.id || i}`}
                    x={x}
                    stroke="#E76F51"
                    strokeOpacity={0.45}
                    strokeDasharray="3 3"
                  />
                )
              })}

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
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                )
              })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})
