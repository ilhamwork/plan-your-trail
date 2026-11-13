"use client"

import { useState, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"

import { WaypointPanel } from "@/components/trail/WaypointPanel"
import type { TrackPoint, Segment, WaypointSegment } from "@/lib/types"
import { useGPXParser } from "@/lib/use-gpx-parser"
import { useHighlightRange } from "@/lib/use-highlight-range"

import { Header } from "@/components/trail/Header"
import { UploadCard } from "@/components/trail/UploadCard"
import { HeaderInfo } from "@/components/trail/HeaderInfo"
import { SegmentList } from "@/components/trail/SegmentList"
import { EmptyState } from "@/components/trail/EmptyState"

import { useWaypoints } from "@/components/trail/hooks/useWaypoints"
import { useRunnerSession } from "@/components/trail/hooks/useRunnerSession"
import { useRouteUpload } from "@/components/trail/hooks/useRouteUpload"
import { usePendingRouteSave } from "@/components/trail/hooks/usePendingRouteSave"
import Link from "next/link"
import { useI18n } from "@/lib/i18n/context"
import { useEntitlements } from "@/lib/entitlements"

// ─── Dynamic Component Imports ─────────────────────────────────────
const MapView = dynamic(
  () => import("@/components/trail/MapView").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-87.5 items-center justify-center rounded-xl bg-gray-100 lg:h-112.5">
        <div className="text-sm text-gray-400">Loading map...</div>
      </div>
    ),
  }
)

const WeatherForecast = dynamic(
  () =>
    import("@/components/trail/WeatherForecast").then(
      (mod) => mod.WeatherForecast
    ),
  { ssr: false }
)

const GradientDistribution = dynamic(
  () =>
    import("@/components/trail/GradientDistribution").then(
      (mod) => mod.GradientDistribution
    ),
  { ssr: false }
)

const PaceEstimator = dynamic(
  () =>
    import("@/components/trail/PaceEstimator").then((mod) => mod.PaceEstimator),
  { ssr: false }
)

const DonationSection = dynamic(
  () =>
    import("@/components/trail/DonationSection").then(
      (mod) => mod.DonationSection
    ),
  { ssr: false }
)

const ModalFormInfo = dynamic(
  () =>
    import("@/components/trail/ModalFormInfo").then((mod) => mod.ModalFormInfo),
  { ssr: false }
)

const SessionNameModal = dynamic(
  () =>
    import("@/components/trail/SessionNameModal").then(
      (mod) => mod.SessionNameModal
    ),
  { ssr: false }
)

const ShareModal = dynamic(
  () => import("@/components/trail/ShareModal").then((mod) => mod.ShareModal),
  { ssr: false }
)

const Footer = dynamic(
  () => import("@/components/trail/Footer").then((mod) => mod.Footer),
  { ssr: false }
)

export default function Home() {
  const { t } = useI18n()
  const { user, isLoading: authLoading } = useEntitlements()
  const { parse: parseGPX } = useGPXParser()
  const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  // Subsystem hooks
  const {
    sessionRunnerName,
    showSessionModal,
    handleSessionNameSubmit,
  } = useRunnerSession()

  const {
    highlightRange,
    clearHighlight,
    toggleHighlight,
    selectHighlight,
  } = useHighlightRange()

  // Forward ref dummy for route upload state; linked with useWaypoints
  const [tempGpxForWaypoints, setTempGpxForWaypoints] = useState<
    Parameters<typeof useWaypoints>[0]
  >(null)

  const {
    waypoints,
    setWaypoints,
    handleAddWaypoint,
    handleEditWaypoint,
    handleRemoveWaypoint,
    sortedWaypoints,
    mergedWaypointSegments,
  } = useWaypoints(tempGpxForWaypoints)

  const handleResetInteractions = useCallback(() => {
    clearHighlight()
    setHoveredPoint(null)
  }, [clearHighlight])

  const {
    gpxData,
    fileName,
    rawGpxContent,
    error,
    setError,
    routeDetails,
    setRouteDetails,
    showDetailsModal,
    isSubmittingDetails,
    isParsingGPX,
    handleFileLoaded,
    handleDetailsSubmit,
    handleDetailsCancel,
  } = useRouteUpload({
    parseGPX,
    sessionRunnerName,
    onWaypointsLoaded: (wps) => setWaypoints(wps),
    onResetInteractions: handleResetInteractions,
  })

  const {
    isSaving,
    savedRouteId,
    saveMessage,
    saveError,
    saveRoute,
  } = usePendingRouteSave()

  const handleSaveRoute = useCallback(async () => {
    if (!rawGpxContent) return
    const res = await saveRoute({
      gpxContent: rawGpxContent,
      fileName: fileName || "route.gpx",
      raceName: routeDetails.raceName || fileName || "Rute Saya",
      raceDate: routeDetails.raceDate,
      runnerName: sessionRunnerName,
      waypoints,
    })

    if (res?.needsAuth) {
      window.location.href = "/register"
    }
  }, [rawGpxContent, fileName, routeDetails, sessionRunnerName, waypoints, saveRoute])

  // Synchronize gpxData with waypoint hook
  if (tempGpxForWaypoints !== gpxData) {
    setTempGpxForWaypoints(gpxData)
  }

  const handleShare = useCallback(() => {
    setShowShareModal(true)
  }, [])

  const handleSegmentTabChange = useCallback(() => {
    clearHighlight()
  }, [clearHighlight])

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

  // Determine current active segments list (waypoint segments if present, otherwise gradient segments)
  const activeSegmentsList = useMemo(() => {
    if (mergedWaypointSegments.length > 0) {
      return mergedWaypointSegments
    }
    return gpxData?.segments || []
  }, [mergedWaypointSegments, gpxData?.segments])

  const activeSegmentIndex = useMemo(() => {
    if (!highlightRange || activeSegmentsList.length === 0) return -1
    return activeSegmentsList.findIndex(
      (s) =>
        s.startIndex === highlightRange.startIndex &&
        s.endIndex === highlightRange.endIndex
    )
  }, [highlightRange, activeSegmentsList])

  const hasPrevSegment =
    activeSegmentIndex === -1
      ? activeSegmentsList.length > 0
      : activeSegmentIndex > 0

  const hasNextSegment =
    activeSegmentIndex === -1
      ? activeSegmentsList.length > 0
      : activeSegmentIndex < activeSegmentsList.length - 1

  const handlePrevSegment = useCallback(() => {
    if (activeSegmentIndex > 0) {
      selectHighlight(activeSegmentsList[activeSegmentIndex - 1])
    } else if (activeSegmentsList.length > 0) {
      // Saat semua rute aktif atau di awal, prev langsung memilih segmen terakhir atau segmen 0
      selectHighlight(
        activeSegmentIndex === -1
          ? activeSegmentsList[activeSegmentsList.length - 1]
          : activeSegmentsList[0]
      )
    }
  }, [activeSegmentIndex, activeSegmentsList, selectHighlight])

  const handleNextSegment = useCallback(() => {
    if (
      activeSegmentIndex >= 0 &&
      activeSegmentIndex < activeSegmentsList.length - 1
    ) {
      selectHighlight(activeSegmentsList[activeSegmentIndex + 1])
    } else if (activeSegmentsList.length > 0) {
      // Saat semua rute aktif, next langsung memilih segmen pertama
      selectHighlight(activeSegmentsList[0])
    }
  }, [activeSegmentIndex, activeSegmentsList, selectHighlight])

  const currentSegmentLabel =
    activeSegmentIndex >= 0
      ? "name" in activeSegmentsList[activeSegmentIndex]
        ? (activeSegmentsList[activeSegmentIndex] as WaypointSegment).name
        : (activeSegmentsList[activeSegmentIndex] as Segment).label
      : undefined

  const mapProps = useMemo(() => {
    if (!gpxData) return null
    return {
      trackPoints: gpxData.trackPoints,
      waypoints: sortedWaypoints,
      bounds: gpxData.bounds,
      stats: gpxData.stats,
      routeName:
        routeDetails.raceName ||
        (fileName ? fileName.replace(/\.gpx$/i, "") : "Rute Trail"),
    }
  }, [gpxData, sortedWaypoints, routeDetails.raceName, fileName])

  return (
    <div className="min-h-screen bg-[#FAF6F1] pb-20 sm:pb-12">
      <Header />

      <main>
        <AnimatePresence mode="wait">
          {!gpxData ? (
            <div className="mx-auto max-w-4xl px-4 py-6">
              <EmptyState
                sessionRunnerName={sessionRunnerName}
                onFileLoaded={handleFileLoaded}
                onError={setError}
                fileName={fileName}
                error={error}
                isLoading={isParsingGPX || isSubmittingDetails}
              />
            </div>
          ) : (
            /* ── Loaded Route Analytic State (Airbnb Editorial Reference) ── */
            <motion.div
              key="loaded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
            >
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
                  onShare={handleShare}
                  onSave={handleSaveRoute}
                  isSaving={isSaving}
                  isSaved={!!savedRouteId}
                />
              )}

              {/* 2. Flat Editorial Sections below Map & Elevation */}
              <div className="mx-auto flex max-w-4xl flex-col px-4 py-6">
                {saveMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-medium text-emerald-900 shadow-xs"
                  >
                    <span>{saveMessage}</span>
                    <Link
                      href="/routes"
                      className="inline-flex min-h-10 items-center rounded-xl bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#2D5A46]"
                    >
                      {t("nav.myRoutes")}
                    </Link>
                  </motion.div>
                )}

                {saveError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-[#B91C1C] shadow-xs"
                  >
                    {saveError}
                  </motion.div>
                )}

                {/* Route Title, Telemetry Summary & Runner/Date Row */}
                <div className="pb-6">
                  <HeaderInfo
                    raceName={routeDetails.raceName}
                    userName={sessionRunnerName}
                    raceDate={routeDetails.raceDate}
                    stats={gpxData.stats}
                    waypointCount={sortedWaypoints.length}
                    fileName={fileName}
                  />
                </div>

                {/* Compact GPX Switcher Bar */}
                <div className="pb-10">
                  <UploadCard
                    onFileLoaded={handleFileLoaded}
                    onError={setError}
                    fileName={fileName}
                    error={error}
                    isLoading={isParsingGPX || isSubmittingDetails}
                  />
                </div>

                {/* 3. Segment Breakdown */}
                <div className="border-t border-[#D1D5DB] py-10">
                  <SegmentList
                    key={fileName}
                    segments={gpxData.segments}
                    waypointSegments={mergedWaypointSegments}
                    highlightRange={highlightRange}
                    onSegmentClick={handleSegmentClick}
                    onWaypointSegmentClick={handleWaypointSegmentClick}
                    onTabChange={handleSegmentTabChange}
                  />
                </div>

                {/* 5. Gradient Distribution */}
                <div className="border-t border-[#D1D5DB] py-10">
                  <GradientDistribution points={gpxData.trackPoints} />
                </div>

                {/* 6. Account Features Group (Pace, Waypoints, Weather) — 1 unified section with 1 CTA when locked */}
                <div className="flex flex-col gap-6 border-t border-[#D1D5DB] py-10">
                  {!authLoading && !user && (
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-[#111827]">
                        Masuk untuk menggunakan fitur analisis lanjutan ini
                      </p>
                      <p className="mt-0.5 text-xs text-[#6B7280]">
                        Kalkulasi estimasi pace, pos checkpoint kustom, dan prakiraan cuaca sesi race.
                      </p>
                    </div>
                  )}

                  <PaceEstimator
                    stats={gpxData.stats}
                    waypoints={sortedWaypoints}
                  />
                  <WaypointPanel
                    totalDistanceKm={gpxData.stats.totalDistance / 1000}
                    waypoints={waypoints}
                    trackPoints={gpxData.trackPoints}
                    fileName={fileName}
                    onAdd={handleAddWaypoint}
                    onEdit={handleEditWaypoint}
                    onRemove={handleRemoveWaypoint}
                  />
                  <WeatherForecast
                    center={gpxData.center}
                    initialDate={routeDetails.raceDate}
                  />

                  {!authLoading && !user && (
                    <div className="pt-2">
                      <Link
                        href="/login"
                        className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#1B4332] px-6 py-2.5 text-sm font-semibold text-[#FAF6F1] transition hover:bg-[#143326] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
                      >
                        Masuk ke Akun
                      </Link>
                    </div>
                  )}
                </div>

                {/* Community Support & Footer */}
                <div className="border-t border-[#D1D5DB] pt-10">
                  <DonationSection />
                </div>
                <Footer runnerName={sessionRunnerName} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Route Details Modal ────────────────────── */}
        <ModalFormInfo
          isOpen={showDetailsModal}
          routeDetails={routeDetails}
          onChange={setRouteDetails}
          onSubmit={handleDetailsSubmit}
          isSubmitting={isSubmittingDetails}
          onCancel={handleDetailsCancel}
        />

        <SessionNameModal
          isOpen={showSessionModal}
          onSubmit={handleSessionNameSubmit}
        />

        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          route={gpxData}
          raceName={routeDetails.raceName}
          userName={sessionRunnerName}
          raceDate={routeDetails.raceDate}
        />
      </main>
    </div>
  )
}
