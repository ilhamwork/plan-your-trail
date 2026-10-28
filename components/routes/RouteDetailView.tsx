"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ArrowLeft, Download, Trash2, Calendar, User } from "lucide-react"
import { useRouter } from "next/navigation"
import type { GPXData, TrackPoint, Segment, WaypointSegment } from "@/lib/types"
import { useHighlightRange } from "@/lib/use-highlight-range"
import { deleteRouteAction } from "@/app/actions/routes"
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

const MetricsPanel = dynamic(
  () => import("@/components/trail/MetricsPanel").then((mod) => mod.MetricsPanel),
  { ssr: false }
)

const SegmentList = dynamic(
  () => import("@/components/trail/SegmentList").then((mod) => mod.SegmentList),
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

  const {
    highlightRange,
    clearHighlight,
    toggleHighlight,
  } = useHighlightRange()

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

  const mapProps = useMemo(() => {
    return {
      trackPoints: gpxData.trackPoints,
      waypoints: gpxData.waypoints,
      bounds: gpxData.bounds,
    }
  }, [gpxData])

  const formattedDate = createdAt
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(createdAt))
    : ""

  return (
    <div className="space-y-6">
      {/* Top Bar with Navigation & Actions */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/routes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] transition hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Rute Saya</span>
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            {routeName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            {raceDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>Race: {raceDate}</span>
              </span>
            )}
            {runnerName && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>Runner: {runnerName}</span>
              </span>
            )}
            {formattedDate && <span>Disimpan {formattedDate}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/routes/${routeId}/gpx`}
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50"
            title="Download file GPX asli"
          >
            <Download className="h-4 w-4 text-gray-500" />
            <span>Download GPX</span>
          </a>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
            <span>Hapus</span>
          </button>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_420px] lg:items-start lg:gap-6">
        {/* Left Column: Map, Elevation Chart, Segments, Weather */}
        <div className="flex flex-col gap-5">
          {/* Map */}
          <MapView
            {...mapProps}
            hoveredPoint={hoveredPoint}
            highlightRange={highlightRange}
            onHover={setHoveredPoint}
          />

          {/* Elevation chart */}
          <ElevationChart
            trackPoints={gpxData.trackPoints}
            waypoints={gpxData.waypoints}
            onHover={setHoveredPoint}
          />

          {/* Segments */}
          <SegmentList
            segments={gpxData.segments}
            waypointSegments={gpxData.waypointSegments}
            onSegmentClick={handleSegmentClick}
            onWaypointSegmentClick={handleWaypointSegmentClick}
            onTabChange={clearHighlight}
          />

          {/* Gradient Distribution */}
          <GradientDistribution points={gpxData.trackPoints} />

          {/* Weather */}
          <WeatherForecast
            center={gpxData.center}
            initialDate={raceDate}
          />
        </div>

        {/* Right Column: Metrics & Pace */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-20">
          <MetricsPanel stats={gpxData.stats} />

          <PaceEstimator
            stats={gpxData.stats}
            waypoints={gpxData.waypoints}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteRouteModal
        isOpen={showDeleteModal}
        routeName={routeName}
        routeId={routeId}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
