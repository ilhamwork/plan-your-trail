"use client"

import { memo, useState } from "react"
import type { Segment, WaypointSegment, HighlightRange } from "@/lib/types"
import { ChevronRight, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { formatKmLabel } from "@/lib/format"
import { useI18n } from "@/lib/i18n/context"

export type SegmentTabType = "waypoints" | "gradient"

interface SegmentListProps {
  segments: Segment[]
  waypointSegments: WaypointSegment[]
  highlightRange?: HighlightRange | null
  activeTab?: SegmentTabType
  onSegmentClick?: (segment: Segment) => void
  onWaypointSegmentClick?: (segment: WaypointSegment) => void
  onTabChange?: (tab: SegmentTabType) => void
}

export const SegmentList = memo(function SegmentList({
  segments,
  waypointSegments,
  highlightRange,
  activeTab,
  onSegmentClick,
  onWaypointSegmentClick,
  onTabChange,
}: SegmentListProps) {
  const { t } = useI18n()
  const hasWaypoints = waypointSegments.length > 0
  const [selectedTab, setTab] = useState<SegmentTabType | null>(null)
  const rawTab = activeTab ?? selectedTab
  const tab: SegmentTabType =
    rawTab === "waypoints" && !hasWaypoints
      ? "gradient"
      : (rawTab ?? (hasWaypoints ? "waypoints" : "gradient"))

  const [localExpandedId, setLocalExpandedId] = useState<number | null>(null)

  const matchedWaypointSegment = highlightRange
    ? waypointSegments.find(
        (s) =>
          s.startIndex === highlightRange.startIndex &&
          s.endIndex === highlightRange.endIndex
      )
    : null

  const matchedGradientSegment = highlightRange
    ? segments.find(
        (s) =>
          s.startIndex === highlightRange.startIndex &&
          s.endIndex === highlightRange.endIndex
      )
    : null

  // If highlightRange points to a segment in the other tab, adjust tab during render (uncontrolled mode)
  const [prevHighlightRange, setPrevHighlightRange] = useState(highlightRange)
  if (highlightRange !== prevHighlightRange) {
    setPrevHighlightRange(highlightRange)
    if (highlightRange && activeTab === undefined) {
      if (
        tab === "waypoints" &&
        !matchedWaypointSegment &&
        matchedGradientSegment
      ) {
        setTab("gradient")
      } else if (
        tab === "gradient" &&
        !matchedGradientSegment &&
        matchedWaypointSegment
      ) {
        setTab("waypoints")
      }
    }
  }

  const activeMatchedSegment =
    tab === "waypoints"
      ? (matchedWaypointSegment ?? matchedGradientSegment)
      : (matchedGradientSegment ?? matchedWaypointSegment)

  const expandedId =
    highlightRange !== undefined
      ? (activeMatchedSegment?.id ?? null)
      : localExpandedId

  return (
    <section aria-label={t("segments.title")} className="py-1">
      {/* Editorial Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-[#111827]">
            {t("segments.title")}
          </h3>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            {tab === "waypoints"
              ? `${waypointSegments.length} segmen · Berdasarkan pos checkpoint`
              : `${segments.length} segmen · Berdasarkan perubahan kemiringan`}
          </p>
        </div>

        {/* Mode Switcher (AllTrails-style rounded pills) */}
        {hasWaypoints && (
          <div
            role="tablist"
            aria-label="Mode segmen rute"
            className="inline-flex rounded-full border border-[#E5E7EB] bg-[#F3F4F6] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "waypoints"}
              onClick={() => {
                if (tab !== "waypoints") {
                  if (activeTab === undefined) setTab("waypoints")
                  setLocalExpandedId(null)
                  onTabChange?.("waypoints")
                }
              }}
              className={`min-h-8 cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
                tab === "waypoints"
                  ? "bg-[#1B4332] text-[#FAF6F1] shadow-xs"
                  : "text-[#4B5563] hover:text-[#111827]"
              }`}
            >
              Checkpoint
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "gradient"}
              onClick={() => {
                if (tab !== "gradient") {
                  if (activeTab === undefined) setTab("gradient")
                  setLocalExpandedId(null)
                  onTabChange?.("gradient")
                }
              }}
              className={`min-h-8 cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
                tab === "gradient"
                  ? "bg-[#1B4332] text-[#FAF6F1] shadow-xs"
                  : "text-[#4B5563] hover:text-[#111827]"
              }`}
            >
              Kemiringan
            </button>
          </div>
        )}
      </div>

      {/* Single-row segment list (flat without card box) */}
      <div className="mt-3 divide-y divide-[#E5E7EB]">
        {tab === "waypoints"
          ? waypointSegments.map((seg) => (
              <WaypointSegmentRow
                key={seg.id}
                segment={seg}
                expanded={expandedId === seg.id}
                onToggle={() =>
                  setLocalExpandedId(expandedId === seg.id ? null : seg.id)
                }
                onClick={() => onWaypointSegmentClick?.(seg)}
              />
            ))
          : segments.map((seg) => (
              <GradientSegmentRow
                key={seg.id}
                segment={seg}
                expanded={expandedId === seg.id}
                onToggle={() =>
                  setLocalExpandedId(expandedId === seg.id ? null : seg.id)
                }
                onClick={() => onSegmentClick?.(seg)}
              />
            ))}
      </div>
    </section>
  )
})

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
        type="button"
        onClick={() => {
          onToggle()
          onClick()
        }}
        aria-expanded={expanded}
        className={`flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1B4332] ${
          expanded ? "bg-[#1B4332] text-[#FAF6F1]" : "hover:bg-[#FAF6F1]/70"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <p
            className={`truncate text-sm font-semibold ${
              expanded ? "text-[#FAF6F1]" : "text-[#2D3436]"
            }`}
          >
            {segment.name}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 tabular-nums">
          <span
            className={`text-xs font-medium ${
              expanded ? "text-[#FAF6F1]/85" : "text-[#4B5563]"
            }`}
          >
            KM {segment.startKm.toFixed(1)} s/d {segment.endKm.toFixed(1)}
          </span>
          <span
            className={`text-sm font-bold ${
              expanded ? "text-[#FAF6F1]" : "text-[#2D3436]"
            }`}
          >
            {formatKmLabel(segment.distance, 2)}
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[#4B5563]" />
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
            <div className="grid grid-cols-2 gap-3 px-4 pt-1 pb-4 sm:grid-cols-4">
              <StatCell
                label="Elevasi Awal"
                value={`${segment.startElevation} m`}
              />
              <StatCell
                label="Elevasi Akhir"
                value={`${segment.endElevation} m`}
              />
              <StatCell
                label="Naik (D+)"
                value={`+${segment.elevationGain} m`}
                color="text-emerald-300"
              />
              <StatCell
                label="Turun (D-)"
                value={`-${segment.elevationLoss} m`}
                color="text-amber-200"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GradientSegmentRow({
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
  // WCAG AA compliant badge colors (minimum 4.5:1 contrast)
  const typeColors: Record<string, string> = {
    climb: "bg-[#991B1B]/12 text-[#991B1B]",
    uphill: "bg-[#B91C1C]/12 text-[#B91C1C]",
    flat: "bg-[#854D0E]/12 text-[#854D0E]",
    downhill: "bg-[#1D4ED8]/12 text-[#1D4ED8]",
    descent: "bg-[#1E3A8A]/12 text-[#1E3A8A]",
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onToggle()
          onClick()
        }}
        aria-expanded={expanded}
        className={`flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1B4332] ${
          expanded ? "bg-[#1B4332] text-[#FAF6F1]" : "hover:bg-[#FAF6F1]/70"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5 tabular-nums">
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
              expanded ? "bg-white/20 text-[#FAF6F1]" : typeColors[segment.type]
            }`}
          >
            {segment.label}
          </span>
          <span
            className={`text-xs font-medium ${
              expanded ? "text-[#FAF6F1]/85" : "text-[#4B5563]"
            }`}
          >
            KM {segment.startKm.toFixed(1)} s/d {segment.endKm.toFixed(1)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2.5 tabular-nums">
          <span
            className={`text-sm font-bold ${
              expanded ? "text-[#FAF6F1]" : "text-[#2D3436]"
            }`}
          >
            {formatKmLabel(segment.distance, 2)}
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#4B5563]" />
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
            <div className="grid grid-cols-2 gap-3 px-4 pt-1 pb-4 sm:grid-cols-3">
              <StatCell
                label="Elevasi Awal"
                value={`${segment.startElevation} m`}
              />
              <StatCell
                label="Elevasi Akhir"
                value={`${segment.endElevation} m`}
              />
              <StatCell
                label="Naik (D+)"
                value={`+${segment.elevationGain} m`}
                color="text-emerald-300"
              />
              <StatCell
                label="Turun (D-)"
                value={`-${segment.elevationLoss} m`}
                color="text-amber-200"
              />
              <StatCell
                label="Rata-rata Gradien"
                value={`${segment.avgGradient}%`}
              />
              <StatCell
                label="Selisih Elevasi"
                value={`${segment.elevationChange > 0 ? "+" : ""}${segment.elevationChange} m`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

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
    <div className="tabular-nums">
      <p className="text-[11px] font-medium text-[#FAF6F1]/80">{label}</p>
      <p className={`text-sm font-bold ${color || "text-[#FAF6F1]"}`}>
        {value}
      </p>
    </div>
  )
}
