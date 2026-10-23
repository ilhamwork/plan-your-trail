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
import { MetricsPanel } from "@/components/trail/MetricsPanel"
import { SegmentList } from "@/components/trail/SegmentList"
import { EmptyState } from "@/components/trail/EmptyState"

import { useWaypoints } from "@/components/trail/hooks/useWaypoints"
import { useRunnerSession } from "@/components/trail/hooks/useRunnerSession"
import { useRouteUpload } from "@/components/trail/hooks/useRouteUpload"

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

const ElevationChart = dynamic(
  () =>
    import("@/components/trail/ElevationChart").then(
      (mod) => mod.ElevationChart
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

const GradientDistribution = dynamic(
  () =>
    import("@/components/trail/GradientDistribution").then(
      (mod) => mod.GradientDistribution
    ),
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

  const mapProps = useMemo(() => {
    if (!gpxData) return null
    return {
      trackPoints: gpxData.trackPoints,
      waypoints: sortedWaypoints,
      bounds: gpxData.bounds,
    }
  }, [gpxData, sortedWaypoints])

  return (
    <div className="min-h-screen bg-[#FAF6F1]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <AnimatePresence mode="wait">
          {!gpxData ? (
            <EmptyState
              sessionRunnerName={sessionRunnerName}
              onFileLoaded={handleFileLoaded}
              onError={setError}
              fileName={fileName}
              error={error}
              isLoading={isParsingGPX || isSubmittingDetails}
            />
          ) : (
            /* ── Loaded state ──────────────────────── */
            <motion.div
              key="loaded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_420px] lg:items-start lg:gap-6"
            >
              {/* Left column (main content on desktop) */}
              <div className="contents lg:flex lg:flex-col lg:gap-5">
                {/* Map */}
                {mapProps && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="order-4 lg:order-0"
                  >
                    <MapView
                      {...mapProps}
                      hoveredPoint={hoveredPoint}
                      highlightRange={highlightRange}
                      onHover={setHoveredPoint}
                    />
                  </motion.div>
                )}

                {/* Elevation chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="order-5 lg:order-0"
                >
                  <ElevationChart
                    trackPoints={gpxData.trackPoints}
                    waypoints={sortedWaypoints}
                    onHover={setHoveredPoint}
                  />
                </motion.div>

                {/* Segments */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="order-7 lg:order-0"
                >
                  <SegmentList
                    key={fileName}
                    segments={gpxData.segments}
                    waypointSegments={mergedWaypointSegments}
                    onSegmentClick={handleSegmentClick}
                    onWaypointSegmentClick={handleWaypointSegmentClick}
                    onTabChange={handleSegmentTabChange}
                  />
                </motion.div>

                {/* Gradient Distribution */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="order-8 lg:order-0"
                >
                  <GradientDistribution points={gpxData.trackPoints} />
                </motion.div>

                {/* Weather */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="order-9 lg:order-0"
                >
                  <WeatherForecast
                    center={gpxData.center}
                    initialDate={routeDetails.raceDate}
                  />
                </motion.div>
              </div>

              {/* Right column (sidebar — sticky on desktop) */}
              <div className="contents lg:sticky lg:top-15 lg:flex lg:flex-col lg:gap-5">
                {/* Upload card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="order-1 lg:order-0"
                >
                  <UploadCard
                    onFileLoaded={handleFileLoaded}
                    fileName={fileName}
                    error={error}
                    isLoading={isParsingGPX || isSubmittingDetails}
                  />
                </motion.div>

                {/* Route Header Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="order-2 lg:order-0"
                >
                  <HeaderInfo
                    raceName={routeDetails.raceName}
                    userName={sessionRunnerName}
                    raceDate={routeDetails.raceDate}
                    onShare={handleShare}
                  />
                </motion.div>

                {/* Metrics */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="order-3 lg:order-0"
                >
                  <MetricsPanel stats={gpxData.stats} />
                </motion.div>

                {/* Manual Waypoints */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="order-6 lg:order-0"
                >
                  <WaypointPanel
                    totalDistanceKm={gpxData.stats.totalDistance / 1000}
                    waypoints={waypoints}
                    trackPoints={gpxData.trackPoints}
                    fileName={fileName}
                    onAdd={handleAddWaypoint}
                    onEdit={handleEditWaypoint}
                    onRemove={handleRemoveWaypoint}
                  />
                </motion.div>

                {/* Donation Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="order-10 lg:order-0"
                >
                  <DonationSection />
                </motion.div>

                <motion.div
                  key="footer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="order-11 lg:order-0"
                >
                  <Footer runnerName={sessionRunnerName} />
                </motion.div>
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
