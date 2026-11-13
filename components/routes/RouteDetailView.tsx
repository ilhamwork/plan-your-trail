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
  Pencil,
  Check,
} from "lucide-react"

import type { GPXData, TrackPoint, Segment, WaypointSegment } from "@/lib/types"
import { useHighlightRange } from "@/lib/use-highlight-range"
import { useWaypoints } from "@/components/trail/hooks/useWaypoints"
import { HeaderInfo } from "@/components/trail/HeaderInfo"
import { SegmentList } from "@/components/trail/SegmentList"
import { WaypointPanel } from "@/components/trail/WaypointPanel"
import { deleteRouteAction, updateRouteAction } from "@/app/actions/routes"
import { DeleteRouteModal } from "./DeleteRouteModal"
import { useEntitlements } from "@/lib/entitlements"

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
  const { user, isLoading: authLoading } = useEntitlements()
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

  // Determine current active segments list (waypoint segments if present, otherwise gradient segments)
  const activeSegmentsList = useMemo(() => {
    if (mergedWaypointSegments.length > 0) {
      return mergedWaypointSegments
    }
    return gpxData.segments || []
  }, [mergedWaypointSegments, gpxData.segments])

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
      selectHighlight(activeSegmentsList[0])
    }
  }, [activeSegmentIndex, activeSegmentsList, selectHighlight])

  const currentSegmentLabel =
    activeSegmentIndex >= 0
      ? "name" in activeSegmentsList[activeSegmentIndex]
        ? (activeSegmentsList[activeSegmentIndex] as WaypointSegment).name
        : (activeSegmentsList[activeSegmentIndex] as Segment).label
      : undefined

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
      stats: gpxData.stats,
      routeName: routeDetails.raceName || routeName,
    }
  }, [gpxData, sortedWaypoints, routeDetails.raceName, routeName])

  const formattedDate = createdAt
    ? new Intl.DateTimeFormat("id-ID", {
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
          onSave={hasUnsavedChanges ? handleSaveChanges : undefined}
          isSaving={isSavingChanges}
          isSaved={!hasUnsavedChanges}
          topLeftSlot={
            <Link
              href="/routes"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D1D5DB] bg-white/95 text-[#2D3436] shadow-md transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              title="Kembali ke Rute Saya"
              aria-label="Kembali ke Rute Saya"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
        />
      )}

      {/* 2. Flat Editorial Sections (No Card Wrapper, separated by dividers) */}
      <div className="mx-auto flex max-w-4xl flex-col px-4 py-6">
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
              Ke Rute Saya
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

        <div className="pb-10">
        <HeaderInfo
          raceName={routeDetails.raceName}
          userName={runnerName || "Pelari Tamu"}
          raceDate={routeDetails.raceDate}
          stats={gpxData.stats}
          waypointCount={sortedWaypoints.length}
          actionSlot={
            <div className="flex flex-wrap items-center gap-2">
              {formattedDate && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EDE8] px-3 py-1.5 text-xs font-semibold text-[#1B4332]">
                  <CloudCheck className="h-3.5 w-3.5 text-[#1B4332]" />
                  <span>Tersimpan {formattedDate}</span>
                </span>
              )}

              <a
                href={`/api/routes/${routeId}/gpx`}
                download
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-3.5 text-xs font-semibold text-[#2D3436] transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
                title="Download file GPX asli dari cloud"
              >
                <Download className="h-4 w-4" />
                <span>Download GPX</span>
              </a>

              <button
                type="button"
                onClick={() => setIsEditingDetails(true)}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[#2D3436] transition hover:border-[#1B4332] hover:bg-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95"
                title="Ubah Nama & Tanggal Race"
                aria-label="Ubah Nama & Tanggal Race"
              >
                <Pencil className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-red-200 bg-red-50/70 text-[#B91C1C] transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C] active:scale-95"
                title="Hapus Rute"
                aria-label="Hapus Rute"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          }
        />
        </div>

        {/* 3. Segment Breakdown */}
        <div className="border-t border-[#D1D5DB] py-10">
          <SegmentList
            key={routeId}
            segments={gpxData.segments}
            waypointSegments={mergedWaypointSegments}
            highlightRange={highlightRange}
            onSegmentClick={handleSegmentClick}
            onWaypointSegmentClick={handleWaypointSegmentClick}
            onTabChange={clearHighlight}
          />
        </div>

        {/* 5. Gradient Distribution */}
        <div className="border-t border-[#D1D5DB] py-10">
          <GradientDistribution points={gpxData.trackPoints} />
        </div>

        {/* 6. Account Features Group (Pace, Waypoints, Weather) */}
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
            fileName={routeDetails.raceName}
            onAdd={handleAddWaypoint}
            onEdit={handleEditWaypoint}
            onRemove={handleRemoveWaypoint}
          />
          <WeatherForecast
            center={gpxData.center}
            initialDate={routeDetails.raceDate || undefined}
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

        <div className="border-t border-[#D1D5DB] pt-10">
          <DonationSection />
        </div>
        <Footer runnerName={runnerName} />
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
