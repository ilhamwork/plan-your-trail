"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Download,
  Trash2,
  CloudCheck,
  Cloud,
  Pencil,
  Check,
  Share2,
} from "lucide-react"

import type { GPXData, TrackPoint, Segment, WaypointSegment } from "@/lib/types"
import { useHighlightRange } from "@/lib/use-highlight-range"
import { useWaypoints } from "@/components/trail/hooks/useWaypoints"
import { HeaderInfo } from "@/components/trail/HeaderInfo"
import { MetricsPanel } from "@/components/trail/MetricsPanel"
import { SegmentList } from "@/components/trail/SegmentList"
import { WaypointPanel } from "@/components/trail/WaypointPanel"
import { deleteRouteAction, updateRouteAction } from "@/app/actions/routes"
import { DeleteRouteModal } from "./DeleteRouteModal"

// ─── Dynamic Trail Analysis Components ──────────────────────────────
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

const DonationSection = dynamic(
  () =>
    import("@/components/trail/DonationSection").then(
      (mod) => mod.DonationSection
    ),
  { ssr: false }
)

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
  } = useHighlightRange()

  // Saving state
  const [isSavingChanges, setIsSavingChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Track if changes have been made
  const initialWaypointsJson = useMemo(
    () => JSON.stringify(gpxData.waypoints || []),
    [gpxData.waypoints]
  )
  const currentWaypointsJson = useMemo(
    () => JSON.stringify(waypoints),
    [waypoints]
  )

  const hasUnsavedChanges = useMemo(() => {
    const nameChanged = routeDetails.raceName !== routeName
    const dateChanged = (routeDetails.raceDate || "") !== (raceDate || "")
    const waypointsChanged = currentWaypointsJson !== initialWaypointsJson
    return nameChanged || dateChanged || waypointsChanged
  }, [
    routeDetails.raceName,
    routeName,
    routeDetails.raceDate,
    raceDate,
    currentWaypointsJson,
    initialWaypointsJson,
  ])

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

      setSaveMessage("Perubahan rute berhasil disimpan ke database!")
      setTimeout(() => setSaveMessage(null), 4000)
    } catch {
      setSaveError("Gagal menyimpan perubahan. Silakan coba lagi.")
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
    }
  }, [gpxData, sortedWaypoints])

  const formattedDate = createdAt
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(createdAt))
    : ""

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/routes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] transition hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Rute Saya</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400">
            <Cloud className="h-3 w-3 text-emerald-600" />
            ID: {routeId.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Main Analysis Grid — Identical to app/page.tsx layout */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_420px] lg:items-start lg:gap-6">
        {/* Left Column (Main Analysis Content on Desktop) */}
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          {saveMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="order-0 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-medium text-emerald-900 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{saveMessage}</span>
              </div>
              <Link
                href="/routes"
                className="rounded-xl bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#2D5A46]"
              >
                Ke Rute Saya
              </Link>
            </motion.div>
          )}

          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="order-0 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 shadow-xs"
            >
              {saveError}
            </motion.div>
          )}

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
              key={routeId}
              segments={gpxData.segments}
              waypointSegments={mergedWaypointSegments}
              onSegmentClick={handleSegmentClick}
              onWaypointSegmentClick={handleWaypointSegmentClick}
              onTabChange={clearHighlight}
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
              initialDate={routeDetails.raceDate || undefined}
            />
          </motion.div>
        </div>

        {/* Right Column (Sidebar — Sticky on Desktop) */}
        <div className="contents lg:sticky lg:top-15 lg:flex lg:flex-col lg:gap-5">
          {/* Saved Route Actions Card — Replaces UploadCard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="order-1 lg:order-0"
          >
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <CloudCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Rute Tersimpan di Cloud
                  </span>
                  {formattedDate && (
                    <p className="text-[11px] text-gray-400">
                      Tersimpan sejak {formattedDate}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingDetails(true)}
                    className="rounded-lg border border-gray-200 bg-white p-2 text-xs font-semibold text-gray-700 shadow-xs transition hover:border-[#1B4332] hover:bg-gray-50 active:scale-95"
                    title="Ubah Nama & Tanggal Race"
                  >
                    <Pencil className="h-3.5 w-3.5 text-gray-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="rounded-lg border border-red-200 bg-red-50/60 p-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 active:scale-95"
                    title="Hapus Rute"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                <a
                  href={`/api/routes/${routeId}/gpx`}
                  download
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-white active:scale-95"
                  title="Download file GPX asli dari cloud"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download GPX Asli</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-[#1B4332] shadow-xs transition hover:bg-[#1B4332]/5 active:scale-95"
                  title="Bagikan rute"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Bagikan</span>
                </button>
              </div>
            </div>
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
              userName={runnerName || "Anonymous"}
              raceDate={routeDetails.raceDate}
              onShare={() => setShowShareModal(true)}
              onSave={hasUnsavedChanges ? handleSaveChanges : undefined}
              isSaving={isSavingChanges}
              isSaved={!hasUnsavedChanges}
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

          {/* Pace Estimator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="order-4 lg:order-0"
          >
            <PaceEstimator
              stats={gpxData.stats}
              waypoints={sortedWaypoints}
            />
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
              fileName={routeDetails.raceName}
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

          {/* Footer */}
          <motion.div
            key="footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="order-11 lg:order-0"
          >
            <Footer runnerName={runnerName} />
          </motion.div>
        </div>
      </div>

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
