"use client"

import { memo, useState } from "react"
import Link from "next/link"
import type { Segment, SegmentType, WaypointSegment, HighlightRange } from "@/lib/types"
import { ChevronRight, ChevronDown, Info, MapPin, LogIn } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { formatKmLabel } from "@/lib/format"
import { useI18n } from "@/lib/i18n/context"
import { useEntitlements } from "@/lib/entitlements"
import { SEGMENT_PILL_CLASSES } from "@/lib/terrain-colors"

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
  const { user } = useEntitlements()
  const hasWaypoints = waypointSegments.length > 0
  const [selectedTab, setTab] = useState<SegmentTabType | null>(null)
  const rawTab = activeTab ?? selectedTab
  const tab: SegmentTabType =
    rawTab ?? (hasWaypoints ? "waypoints" : "gradient")

  const [localExpandedId, setLocalExpandedId] = useState<number | null>(null)
  const [showGradeGuide, setShowGradeGuide] = useState(false)

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
          <div className="mt-0.5 flex items-center gap-1.5">
            <p className="text-xs font-medium text-[#4B5563]">
              {tab === "waypoints"
                ? t("segments.subtitleWaypoints", { count: waypointSegments.length })
                : t("segments.subtitleGradient", { count: segments.length })}
            </p>
            {tab === "gradient" && (
              <button
                type="button"
                aria-label={t("segments.gradeGuideToggleAria")}
                aria-expanded={showGradeGuide}
                onClick={() => setShowGradeGuide((prev) => !prev)}
                className="-my-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#4B5563] transition hover:bg-[#F1EDE8] hover:text-[#1B4332] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          {tab === "gradient" && showGradeGuide && (
            <p className="mt-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs leading-relaxed text-[#4B5563]">
              {t("segments.gradeGuideText")}
            </p>
          )}
        </div>

        {/* Mode Switcher (AllTrails-style rounded pills) */}
        <div
          role="tablist"
          aria-label={t("segments.modeAria")}
          className="w-full inline-flex rounded-full border border-[#E5E7EB] bg-[#F3F4F6] p-1"
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
            className={`min-h-8 w-full cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
              tab === "waypoints"
                ? "bg-[#1B4332] text-[#FAF6F1] shadow-xs"
                : "text-[#4B5563] hover:text-[#111827]"
            }`}
          >
            {t("segments.tabWaypoints")}
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
            className={`min-h-8 w-full cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
              tab === "gradient"
                ? "bg-[#1B4332] text-[#FAF6F1] shadow-xs"
                : "text-[#4B5563] hover:text-[#111827]"
            }`}
          >
            {t("segments.tabGradient")}
          </button>
        </div>
      </div>

      {/* Single-row segment list (flat without card box) */}
      <div className="mt-3 divide-y divide-[#E5E7EB]">
        {tab === "waypoints" ? (
          hasWaypoints ? (
            waypointSegments.map((seg) => (
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
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] bg-[#FAF6F1]/50 px-5 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1B4332]/10 text-[#1B4332]">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm font-semibold text-[#111827]">
                {t("segments.emptyWaypointsTitle")}
              </p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-[#4B5563]">
                {user
                  ? t("segments.emptyWaypointsDescLoggedIn")
                  : t("segments.emptyWaypointsDescGuest")}
              </p>
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById("waypoint-management")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }}
                  className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-[#FAF6F1] transition hover:bg-[#143326] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("segments.emptyWaypointsAddCta")}</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-[#FAF6F1] transition hover:bg-[#143326] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
                >
                  <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("segments.emptyWaypointsLoginCta")}</span>
                </Link>
              )}
            </div>
          )
        ) : (
          segments.map((seg) => (
            <GradientSegmentRow
              key={seg.id}
              segment={seg}
              expanded={expandedId === seg.id}
              onToggle={() =>
                setLocalExpandedId(expandedId === seg.id ? null : seg.id)
              }
              onClick={() => onSegmentClick?.(seg)}
            />
          ))
        )}
      </div>
    </section>
  )
})

function getLocalizedSegmentLabel(
  type: SegmentType,
  t: (path: string) => string
): string {
  switch (type) {
    case "climb":
      return t("segments.typeClimb")
    case "uphill":
      return t("segments.typeUphill")
    case "flat":
      return t("segments.typeFlat")
    case "downhill":
      return t("segments.typeDownhill")
    case "descent":
      return t("segments.typeDescent")
  }
}

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
  const { t } = useI18n()

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
            {t("segments.kmRange", {
              start: segment.startKm.toFixed(1),
              end: segment.endKm.toFixed(1),
            })}
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
            <div className="grid grid-cols-2 gap-3 px-4 pt-1 pb-4 sm:grid-cols-3">
              <StatCell
                label={t("segments.startElev")}
                value={`${segment.startElevation} m`}
              />
              <StatCell
                label={t("segments.endElev")}
                value={`${segment.endElevation} m`}
              />
              <StatCell
                label={t("segments.gainLabel")}
                value={`+${segment.elevationGain} m`}
                color="text-emerald-300"
              />
              <StatCell
                label={t("segments.lossLabel")}
                value={`-${segment.elevationLoss} m`}
                color="text-amber-200"
              />
              <StatCell
                label={t("segments.avgGradientLabel")}
                value={`${segment.avgGradient}%`}
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
  const { t } = useI18n()

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
              expanded
                ? "bg-white/20 text-[#FAF6F1]"
                : SEGMENT_PILL_CLASSES[segment.type]
            }`}
          >
            {getLocalizedSegmentLabel(segment.type, t)}
          </span>
          <span
            className={`text-xs font-medium ${
              expanded ? "text-[#FAF6F1]/85" : "text-[#4B5563]"
            }`}
          >
            {t("segments.kmRange", {
              start: segment.startKm.toFixed(1),
              end: segment.endKm.toFixed(1),
            })}
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
                label={t("segments.startElev")}
                value={`${segment.startElevation} m`}
              />
              <StatCell
                label={t("segments.endElev")}
                value={`${segment.endElevation} m`}
              />
              <StatCell
                label={t("segments.gainLabel")}
                value={`+${segment.elevationGain} m`}
                color="text-emerald-300"
              />
              <StatCell
                label={t("segments.lossLabel")}
                value={`-${segment.elevationLoss} m`}
                color="text-amber-200"
              />
              <StatCell
                label={t("segments.avgGradientLabel")}
                value={`${segment.avgGradient}%`}
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
