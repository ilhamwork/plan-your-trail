"use client"

import { useState } from "react"
import type { Segment, WaypointSegment } from "@/lib/types"
import { Waypoints, ChevronRight, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface SegmentListProps {
  segments: Segment[]
  waypointSegments: WaypointSegment[]
  onSegmentClick?: (segment: Segment) => void
  onWaypointSegmentClick?: (segment: WaypointSegment) => void
  onTabChange?: () => void
}

type TabType = "waypoints" | "elevation"

export function SegmentList({
  segments,
  waypointSegments,
  onSegmentClick,
  onWaypointSegmentClick,
  onTabChange,
}: SegmentListProps) {
  const hasWaypoints = waypointSegments.length > 0
  const [tab, setTab] = useState<TabType>(
    hasWaypoints ? "waypoints" : "elevation"
  )
  const [expandedId, setExpandedId] = useState<number | null>(null)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Waypoints className="h-4 w-4 text-[#1B4332]" />
          <h3 className="text-sm font-bold text-[#2D3436]">Route Segments</h3>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          {tab === "waypoints"
            ? `${waypointSegments.length} segments • Based on waypoints`
            : `${segments.length} segments • Based on gradient`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {hasWaypoints && (
          <button
            onClick={() => {
              if (tab !== "waypoints") {
                setTab("waypoints")
                setExpandedId(null)
                onTabChange?.()
              }
            }}
            className={`flex-1 py-2.5 text-xs font-semibold transition-all ${
              tab === "waypoints"
                ? "border-b-2 border-[#1B4332] bg-white text-[#1B4332]"
                : "bg-gray-50 text-gray-400 hover:text-gray-600"
            }`}
          >
            Water Station
          </button>
        )}
        <button
          onClick={() => {
            if (tab !== "elevation") {
              setTab("elevation")
              setExpandedId(null)
              onTabChange?.()
            }
          }}
          className={`flex-1 py-2.5 text-xs font-semibold transition-all ${
            tab === "elevation"
              ? "border-b-2 border-[#1B4332] bg-white text-[#1B4332]"
              : "bg-gray-50 text-gray-400 hover:text-gray-600"
          }`}
        >
          Gradient
        </button>
      </div>

      {/* Segment list */}
      <div className="divide-y divide-gray-50">
        {tab === "waypoints"
          ? waypointSegments.map((seg) => (
              <WaypointSegmentRow
                key={seg.id}
                segment={seg}
                expanded={expandedId === seg.id}
                onToggle={() =>
                  setExpandedId(expandedId === seg.id ? null : seg.id)
                }
                onClick={() => onWaypointSegmentClick?.(seg)}
              />
            ))
          : segments.map((seg) => (
              <ElevationSegmentRow
                key={seg.id}
                segment={seg}
                expanded={expandedId === seg.id}
                onToggle={() =>
                  setExpandedId(expandedId === seg.id ? null : seg.id)
                }
                onClick={() => onSegmentClick?.(seg)}
              />
            ))}
      </div>
    </div>
  )
}

// ─── Waypoint segment row ──────────────────────────────────────────
function WaypointSegmentRow({
  segment,
  expanded,
  onToggle,
  onClick,
}: {
  segment: WaypointSegment
  expanded: boolean
  onToggle: () => void
  onClick: () => void
}) {
  return (
    <div>
      <button
        onClick={() => {
          onToggle()
          onClick()
        }}
        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
          expanded ? "bg-[#1B4332] text-white" : "hover:bg-gray-50"
        }`}
      >
        <div className="flex flex-1 items-center gap-2">
          <p
            className={`text-sm font-semibold ${expanded ? "text-white" : "text-[#2D3436]"}`}
          >
            {segment.name}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${expanded ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {(segment.distance / 1000).toFixed(2)} km
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-[#1B4332]"
          >
            <div className="grid grid-cols-2 gap-3 px-4 pt-1 pb-4">
              <StatCell
                label="START ELEV"
                value={`${segment.startElevation}m`}
              />
              <StatCell label="END ELEV" value={`${segment.endElevation}m`} />
              <StatCell
                label="GAIN"
                value={`+${segment.elevationGain}m`}
                color="text-green-400"
              />
              <StatCell
                label="LOSS"
                value={`-${segment.elevationLoss}m`}
                color="text-red-400"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Elevation segment row ─────────────────────────────────────────
function ElevationSegmentRow({
  segment,
  expanded,
  onToggle,
  onClick,
}: {
  segment: Segment
  expanded: boolean
  onToggle: () => void
  onClick: () => void
}) {
  const typeColors: Record<string, string> = {
    climb: "bg-red-100 text-red-700",
    uphill: "bg-orange-100 text-orange-700",
    flat: "bg-green-100 text-green-700",
    downhill: "bg-blue-100 text-blue-700",
    descent: "bg-purple-100 text-purple-700",
  }

  return (
    <div>
      <button
        onClick={() => {
          onToggle()
          onClick()
        }}
        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
          expanded ? "bg-[#1B4332] text-white" : "hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              expanded ? "bg-white/20 text-white" : typeColors[segment.type]
            }`}
          >
            {segment.label}
          </span>
          <span
            className={`text-xs ${expanded ? "text-white/70" : "text-gray-400"}`}
          >
            KM {segment.startKm.toFixed(1)}–{segment.endKm.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${expanded ? "text-white" : "text-[#2D3436]"}`}
          >
            {(segment.distance / 1000).toFixed(2)} km
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-[#1B4332]"
          >
            <div className="grid grid-cols-2 gap-3 px-4 pt-1 pb-4">
              <StatCell
                label="START ELEV"
                value={`${segment.startElevation}m`}
              />
              <StatCell label="END ELEV" value={`${segment.endElevation}m`} />
              <StatCell
                label="GAIN"
                value={`+${segment.elevationGain}m`}
                color="text-green-400"
              />
              <StatCell
                label="LOSS"
                value={`-${segment.elevationLoss}m`}
                color="text-red-400"
              />
              <StatCell
                label="AVG GRADIENT"
                value={`${segment.avgGradient}%`}
              />
              <StatCell
                label="ELEV CHANGE"
                value={`${segment.elevationChange > 0 ? "+" : ""}${segment.elevationChange}m`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Stat cell ─────────────────────────────────────────────────────
function StatCell({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div>
      <p className="text-[10px] font-medium tracking-wider text-white/50 uppercase">
        {label}
      </p>
      <p className={`text-sm font-bold ${color || "text-white"}`}>{value}</p>
    </div>
  )
}
