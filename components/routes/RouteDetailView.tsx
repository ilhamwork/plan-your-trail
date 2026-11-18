"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Download,
  Trash2,
  CloudCheck,
  Pencil,
  Check,
  Save,
  AlertCircle,
  Loader2,
} from "lucide-react"

import type { GPXData, TrackPoint, Segment, WaypointSegment } from "@/lib/types"
import { useHighlightRange } from "@/lib/use-highlight-range"
import { useWaypoints } from "@/components/trail/hooks/useWaypoints"
import { useSegmentNavigation } from "@/components/trail/hooks/useSegmentNavigation"
import { HeaderInfo } from "@/components/trail/HeaderInfo"
import { SegmentList, type SegmentTabType } from "@/components/trail/SegmentList"
import { WaypointPanel } from "@/components/trail/WaypointPanel"
import { deleteRouteAction, updateRouteAction } from "@/app/actions/routes"
import { DeleteRouteModal } from "./DeleteRouteModal"
import { useI18n } from "@/lib/i18n/context"
import { downloadGPX } from "@/lib/gpx-export"

function MapLoadingFallback() {
  const { t } = useI18n()
  return (
    <div className="flex h-87.5 items-center justify-center rounded-xl bg-gray-100 lg:h-112.5">
      <div className="text-sm text-gray-400">{t("home.loadingMap")}</div>
    </div>
  )
}

// ─── Dynamic Trail Analysis Components ──────────────────────────────
const MapView = dynamic(
  () => import("@/components/trail/MapView").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  }
)

const GradientDistribution = dynamic(
  () =>
    import("@/components/trail/GradientDistribution").then(
      (mod) => mod.GradientDistribution
    ),
  { ssr: false }
)

const WeatherForecast = dynamic(
  () =>
    import("@/components/trail/WeatherForecast").then(
      (mod) => mod.WeatherForecast
    ),
  { ssr: false }
)

const PaceEstimator = dynamic(
  () =>
    import("@/components/trail/PaceEstimator").then((mod) => mod.PaceEstimator),
  { ssr: false }
)

const ProFeaturesTeaser = dynamic(
  () =>
    import("@/components/trail/ProFeaturesTeaser").then(
      (mod) => mod.ProFeaturesTeaser
    ),
  { ssr: false }
)

// const DonationSection = dynamic(
//   () =>
//     import("@/components/trail/DonationSection").then(
//       (mod) => mod.DonationSection
//     ),
//   { ssr: false }
// )

const Footer = dynamic(
  () => import("@/components/trail/Footer").then((mod) => mod.Footer),
  { ssr: false }
)

const ShareModal = dynamic(
  () => import("@/components/trail/ShareModal").then((mod) => mod.ShareModal),
  { ssr: false }
)

const ModalFormInfo = dynamic(
  () =>
    import("@/components/trail/ModalFormInfo").then((mod) => mod.ModalFormInfo),
  { ssr: false }
)

interface RouteDetailViewProps {
  routeId: string
  routeName: string
  gpxData: GPXData
  raceDate?: string
  runnerName?: string
  createdAt?: string
}

export function RouteDetailView({
  routeId,
  routeName,
  gpxData,
  raceDate,
  runnerName,
  createdAt,
}: RouteDetailViewProps) {
  const router = useRouter()
  const { t, locale } = useI18n()
  const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isEditingDetails, setIsEditingDetails] = useState(false)

  // Route details state (editable)
  const [routeDetails, setRouteDetails] = useState({
    raceName: routeName,
    raceDate: raceDate || "",
  })

  // Waypoints management state
  const {
    waypoints,
    handleAddWaypoint,
    handleEditWaypoint,
    handleRemoveWaypoint,
    sortedWaypoints,
    mergedWaypointSegments,
  } = useWaypoints(gpxData, gpxData.waypoints || [])

  // Highlight range for segments and points
  const {
    highlightRange,
    clearHighlight,
    toggleHighlight,
    selectHighlight,
  } = useHighlightRange()

  // Saving state
  const [isSavingChanges, setIsSavingChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Track if changes have been made
  const [savedWaypointsJson, setSavedWaypointsJson] = useState(() =>
    JSON.stringify(gpxData.waypoints || [])
  )
  const [savedDetails, setSavedDetails] = useState({
    raceName: routeName,
    raceDate: raceDate || "",
  })

  const currentWaypointsJson = useMemo(
    () => JSON.stringify(waypoints),
    [waypoints]
  )

  const hasUnsavedChanges = useMemo(() => {
    const nameChanged = routeDetails.raceName !== savedDetails.raceName
    const dateChanged = (routeDetails.raceDate || "") !== (savedDetails.raceDate || "")
    const waypointsChanged = currentWaypointsJson !== savedWaypointsJson
    return nameChanged || dateChanged || waypointsChanged
  }, [
    routeDetails.raceName,
    savedDetails.raceName,
    routeDetails.raceDate,
    savedDetails.raceDate,
    currentWaypointsJson,
    savedWaypointsJson,
  ])

  const [segmentTab, setSegmentTab] = useState<SegmentTabType | null>(null)

  const handleSegmentTabChange = useCallback(
    (nextTab: SegmentTabType) => {
      setSegmentTab(nextTab)
      clearHighlight()
    },
    [clearHighlight]
  )

  const handleSegmentClick = useCallback(
    (segment: Segment) => {
      toggleHighlight(segment)
    },
    [toggleHighlight]
  )

  const handleWaypointSegmentClick = useCallback(
    (segment: WaypointSegment) => {
      toggleHighlight(segment)
    },
    [toggleHighlight]
  )

  const hasWaypointSegments = mergedWaypointSegments.length > 0
  const effectiveSegmentTab: SegmentTabType =
    segmentTab ?? (hasWaypointSegments ? "waypoints" : "gradient")

  // Determine current active segments list based on the selected SegmentList tab
  const activeSegmentsList = useMemo(() => {
    if (effectiveSegmentTab === "waypoints") {
      return mergedWaypointSegments
    }
    return gpxData.segments || []
  }, [effectiveSegmentTab, mergedWaypointSegments, gpxData.segments])

  const {
    hasPrevSegment,
    hasNextSegment,
    handlePrevSegment,
    handleNextSegment,
    currentSegmentLabel,
  } = useSegmentNavigation({
    segments: activeSegmentsList,
    highlightRange,
    selectHighlight,
    clearHighlight,
  })

  const handleDelete = async () => {
    const res = await deleteRouteAction({ routeId })
    if (!res.ok) {
      throw new Error(res.error.message)
    }
    router.push("/routes")
  }

  const handleSaveChanges = async () => {
    setIsSavingChanges(true)
    setSaveError(null)
    setSaveMessage(null)

    try {
      const res = await updateRouteAction({
        routeId,
        name: routeDetails.raceName,
        raceDate: routeDetails.raceDate || null,
        waypoints,
      })

      if (!res.ok) {
        setSaveError(res.error.message)
        return
      }

      setSavedWaypointsJson(JSON.stringify(waypoints))
      setSavedDetails({
        raceName: routeDetails.raceName,
        raceDate: routeDetails.raceDate || "",
      })
      setSaveMessage(t("routeDetail.saveSuccess"))
      setTimeout(() => setSaveMessage(null), 4000)
    } catch {
      setSaveError(t("routeDetail.saveError"))
    } finally {
      setIsSavingChanges(false)
    }
  }

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsEditingDetails(false)
  }

  const mapProps = useMemo(() => {
    return {
      trackPoints: gpxData.trackPoints,
      waypoints: sortedWaypoints,
      bounds: gpxData.bounds,
      stats: gpxData.stats,
      routeName: routeDetails.raceName || routeName,
    }
  }, [gpxData, sortedWaypoints, routeDetails.raceName, routeName])

  const formattedDate = createdAt
    ? new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(createdAt))
    : ""

  return (
    <div>
      {/* 1. Hero Stage: Route Map + Elevation Chart (No margin, no padding, no card) */}
      {mapProps && (
        <MapView
          {...mapProps}
          hoveredPoint={hoveredPoint}
          highlightRange={highlightRange}
          onHover={setHoveredPoint}
          onClearHighlight={clearHighlight}
          onPrevSegment={handlePrevSegment}
          onNextSegment={handleNextSegment}
          hasPrevSegment={hasPrevSegment}
          hasNextSegment={hasNextSegment}
          currentSegmentLabel={currentSegmentLabel}
          onShare={() => setShowShareModal(true)}
          onSave={hasUnsavedChanges ? handleSaveChanges : () => setShowDeleteModal(true)}
          isSaving={isSavingChanges}
          isSaved={!hasUnsavedChanges}
          saveError={saveError}
          onDismissSaveError={() => setSaveError(null)}
        />
      )}

      {/* 2. Two-Column Airbnb/AllTrails Editorial Layout */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-medium text-emerald-900 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{saveMessage}</span>
            </div>
            <Link
              href="/routes"
              className="inline-flex min-h-10 items-center rounded-xl bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#2D5A46]"
            >
              {t("routeDetail.toMyRoutes")}
            </Link>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 lg:items-start lg:gap-10">
          {/* Left Main Editorial Column */}
          <div className="flex flex-col lg:col-span-7 xl:col-span-8">
            <div className="pb-5 lg:pb-6">
              <HeaderInfo
                raceName={routeDetails.raceName}
                userName={runnerName || ""}
                raceDate={routeDetails.raceDate}
                stats={gpxData.stats}
                waypointCount={sortedWaypoints.length}
                actionSlot={
                  <div className="flex flex-wrap items-center gap-2.5">
                    {formattedDate && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EDE8] px-3 py-1.5 text-xs font-semibold text-[#1B4332]">
                        <CloudCheck className="h-3.5 w-3.5 text-[#1B4332]" aria-hidden="true" />
                        <span>{t("routeDetail.savedBadge", { date: formattedDate })}</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        downloadGPX(
                          gpxData.trackPoints,
                          sortedWaypoints,
                          (routeDetails.raceName || routeName).replace(/\.gpx$/i, "")
                        )
                      }
                      disabled={gpxData.trackPoints.length === 0}
                      className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#1B4332] bg-[#1B4332] px-3.5 text-xs font-semibold text-[#FAF6F1] shadow-[0_1px_2px_rgba(27,67,50,0.18)] transition hover:border-[#143326] hover:bg-[#143326] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                      title={t("routeDetail.downloadTitle")}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t("routeDetail.downloadGpx")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEditingDetails(true)}
                      className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-3 text-xs font-semibold text-[#2D3436] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition hover:border-[#1B4332] hover:bg-[#FAF6F1] hover:text-[#1B4332] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:translate-y-px"
                      title={t("routeDetail.editDetailsAria")}
                      aria-label={t("routeDetail.editDetailsAria")}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t("routeDetail.editBtn")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-[#B91C1C] shadow-[0_1px_2px_rgba(185,28,28,0.06)] transition hover:border-[#B91C1C] hover:bg-[#B91C1C] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C] active:translate-y-px"
                      title={t("routeDetail.deleteRouteAria")}
                      aria-label={t("routeDetail.deleteRouteAria")}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t("routeDetail.deleteBtn")}</span>
                    </button>
                  </div>
                }
              />
            </div>

            {/* 3. Waypoint Management (placed right before Segment Breakdown) */}
            <div id="waypoint-management" className="border-t border-[#D1D5DB] py-6 sm:py-8">
              <WaypointPanel
                totalDistanceKm={gpxData.stats.totalDistance / 1000}
                waypoints={waypoints}
                trackPoints={gpxData.trackPoints}
                fileName={routeDetails.raceName}
                hideDownload
                onAdd={handleAddWaypoint}
                onEdit={handleEditWaypoint}
                onRemove={handleRemoveWaypoint}
              />
            </div>

            {/* 4. Segment Breakdown */}
            <div className="border-t border-[#D1D5DB] py-6 sm:py-8">
              <SegmentList
                key={routeId}
                segments={gpxData.segments}
                waypointSegments={mergedWaypointSegments}
                highlightRange={highlightRange}
                activeTab={effectiveSegmentTab}
                onSegmentClick={handleSegmentClick}
                onWaypointSegmentClick={handleWaypointSegmentClick}
                onTabChange={handleSegmentTabChange}
              />
            </div>

            {/* 5. Gradient Distribution */}
            <div className="border-t border-[#D1D5DB] py-6 sm:py-8">
              <GradientDistribution points={gpxData.trackPoints} />
            </div>
          </div>

          {/* Right Sticky Planning Sidebar */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-20 lg:col-span-5 xl:col-span-4">
            <div className="flex flex-col gap-5 border-t border-[#D1D5DB] pt-6 lg:border-t-0 lg:pt-0">
              <PaceEstimator stats={gpxData.stats} />
              <WeatherForecast
                center={gpxData.center}
                initialDate={routeDetails.raceDate || undefined}
              />
            </div>

            {/* Pro Features Teaser (Cutoff Estimator + Hourly Weather) */}
            <div className="border-t border-[#D1D5DB] pt-6 lg:border-t-0 lg:pt-0">
              <ProFeaturesTeaser waypoints={sortedWaypoints} />
            </div>
          </aside>
        </div>

        {/* <div className="border-t border-[#D1D5DB] pt-10 lg:mt-6">
          <DonationSection />
        </div> */}
        <Footer runnerName={runnerName} />
      </div>

      {/* Sticky Save Bar when changes are unsaved (e.g. adding waypoints) */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="truncate text-xs font-semibold text-amber-900">
                {t("routeDetail.unsavedBanner")}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSavingChanges}
              className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#2D5A46] disabled:opacity-50"
            >
              {isSavingChanges ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t("routeDetail.saving")}</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>{t("common.save")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────── */}
      <DeleteRouteModal
        isOpen={showDeleteModal}
        routeName={routeDetails.raceName}
        routeId={routeId}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        route={gpxData}
        raceName={routeDetails.raceName}
        userName={runnerName || "Anonymous"}
        raceDate={routeDetails.raceDate}
      />

      <ModalFormInfo
        isOpen={isEditingDetails}
        routeDetails={routeDetails}
        onChange={setRouteDetails}
        onSubmit={handleDetailsSubmit}
        onCancel={() => {
          setIsEditingDetails(false)
          setRouteDetails({
            raceName: routeName,
            raceDate: raceDate || "",
          })
        }}
      />
    </div>
  )
}
