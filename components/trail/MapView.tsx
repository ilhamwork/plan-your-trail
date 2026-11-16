"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type {
  TrackPoint,
  Waypoint,
  HighlightRange,
  RouteStats,
} from "@/lib/types"
import {
  LocateFixed,
  Layers,
  Maximize2,
  Minimize2,
  X,
  ChevronUp,
  BarChart3,
  Heart,
  Share,
  Loader2,
} from "lucide-react"
import "maplibre-gl/dist/maplibre-gl.css"
import { ElevationChart } from "./ElevationChart"
import { useMaplibreMap } from "./map/useMaplibreMap"
import { useI18n } from "@/lib/i18n/context"

interface MapViewProps {
  trackPoints: TrackPoint[]
  waypoints: Waypoint[]
  bounds: [[number, number], [number, number]]
  stats?: RouteStats
  routeName?: string
  hoveredPoint?: TrackPoint | null
  highlightRange?: HighlightRange | null
  onHover?: (point: TrackPoint | null) => void
  onClearHighlight?: () => void
  onPrevSegment?: () => void
  onNextSegment?: () => void
  hasPrevSegment?: boolean
  hasNextSegment?: boolean
  currentSegmentLabel?: string
  onSave?: () => void
  isSaving?: boolean
  isSaved?: boolean
  onShare?: () => void
  isSharing?: boolean
  topLeftSlot?: React.ReactNode
  betweenMapAndChartSlot?: React.ReactNode
}

export function MapView({
  trackPoints,
  waypoints,
  bounds,
  stats,
  routeName,
  hoveredPoint,
  highlightRange,
  onHover,
  onClearHighlight,
  onPrevSegment,
  onNextSegment,
  hasPrevSegment = false,
  hasNextSegment = false,
  currentSegmentLabel,
  onSave,
  isSaving = false,
  isSaved = false,
  onShare,
  isSharing = false,
  topLeftSlot,
  betweenMapAndChartSlot,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  const [is3D, setIs3D] = useState(false)
  const [isSatellite, setIsSatellite] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showChart, setShowChart] = useState(true)
  const isChartVisible = !isFullscreen || showChart

  // Hover synchronization between chart and map
  const [localHoveredPoint, setLocalHoveredPoint] = useState<TrackPoint | null>(
    null
  )
  const activeHoveredPoint =
    hoveredPoint !== undefined ? hoveredPoint : localHoveredPoint

  const handleHover = useCallback(
    (point: TrackPoint | null) => {
      setLocalHoveredPoint(point)
      onHover?.(point)
    },
    [onHover]
  )

  // MapLibre map subsystem (supports both 2D and 3D with 360° rotation)
  const { mapReady, resize, resetView } = useMaplibreMap({
    containerRef: mapContainerRef,
    is3D,
    trackPoints,
    waypoints,
    bounds,
    isSatellite,
    hoveredPoint: activeHoveredPoint,
    highlightRange,
  })

  const handleRecenter = useCallback(() => {
    if (highlightRange && onClearHighlight) {
      onClearHighlight()
    }
    resetView()
  }, [highlightRange, onClearHighlight, resetView])

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [isFullscreen])

  // Prevent scrolling when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isFullscreen])

  // Handle map resize on fullscreen transition & chart toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      resize()
    }, 350)

    return () => clearTimeout(timer)
  }, [isFullscreen, is3D, mapReady, isChartVisible, resize])

  return (
    <section
      aria-label="Peta Rute dan Profil Elevasi"
      className={`w-full transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-1003 flex flex-col bg-[#FAF6F1]"
          : ""
      }`}
    >
      {/* Spatial Map Stage */}
      <div
        className={`relative w-full ${
          isFullscreen
            ? "min-h-0 flex-1"
            : isChartVisible
              ? "h-[360px] sm:h-[420px] lg:h-[440px]"
              : "h-[460px] sm:h-[520px]"
        }`}
      >
        {/* MapLibre Canvas */}
        <div
          ref={mapContainerRef}
          className="h-full w-full"
          style={{ position: "relative" }}
        />

        {/* Floating Top Overlay: Left (Back/Slot + Map Controls) & Right (Share + Love/Save) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3 sm:p-4">
          {/* Left: Optional back/upload action + Map View Controls */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            {topLeftSlot}

            <button
              type="button"
              onClick={handleRecenter}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#D1D5DB] bg-white/95 text-[#2D3436] shadow-md transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95"
              title="Pusatkan kembali peta ke seluruh rute"
              aria-label="Pusatkan kembali peta ke seluruh rute"
            >
              <LocateFixed className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIs3D(!is3D)}
              className={`flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-3.5 text-xs font-bold shadow-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95 ${
                is3D
                  ? "border-[#1B4332] bg-[#1B4332] text-[#FAF6F1]"
                  : "border-[#D1D5DB] bg-white/95 text-[#2D3436] hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1]"
              }`}
              title={is3D ? "Nonaktifkan Medan 3D" : "Aktifkan Medan 3D"}
              aria-label={is3D ? "Nonaktifkan Medan 3D" : "Aktifkan Medan 3D"}
              aria-pressed={is3D}
            >
              3D
            </button>

            <button
              type="button"
              onClick={() => setIsSatellite(!isSatellite)}
              className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border shadow-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95 ${
                isSatellite
                  ? "border-[#1B4332] bg-[#1B4332] text-[#FAF6F1]"
                  : "border-[#D1D5DB] bg-white/95 text-[#2D3436] hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1]"
              }`}
              title={isSatellite ? "Gunakan Peta Topografi" : "Gunakan Citra Satelit"}
              aria-label={
                isSatellite ? "Gunakan Peta Topografi" : "Gunakan Citra Satelit"
              }
              aria-pressed={isSatellite}
            >
              <Layers className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border shadow-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95 ${
                isFullscreen
                  ? "border-[#1B4332] bg-[#1B4332] text-[#FAF6F1]"
                  : "border-[#D1D5DB] bg-white/95 text-[#2D3436] hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1]"
              }`}
              title={isFullscreen ? "Keluar Layar Penuh (Esc)" : "Layar Penuh"}
              aria-label={
                isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"
              }
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Right: Share & Love (Save Route) Actions (Airbnb-inspired top-right overlay) */}
          <div className="pointer-events-auto flex items-center gap-2">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                disabled={isSharing}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#D1D5DB] bg-white/95 text-[#2D3436] shadow-md transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95 disabled:opacity-50"
                title={t("routeChart.shareRoute")}
                aria-label={t("routeChart.shareRoute")}
              >
                <Share className="h-4 w-4" />
              </button>
            )}

            {(onSave || isSaved) && (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving || (!onSave && isSaved)}
                className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border shadow-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95 disabled:opacity-80 ${
                  isSaved
                    ? "border-[#E76F51]/40 bg-white text-[#E76F51]"
                    : "border-[#D1D5DB] bg-white/95 text-[#2D3436] hover:border-[#E76F51] hover:text-[#E76F51]"
                }`}
                title={isSaved ? t("routeChart.routeSaved") : t("routeChart.saveRoute")}
                aria-label={isSaved ? t("routeChart.saved") : t("routeChart.saveRoute")}
                aria-pressed={isSaved}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#1B4332]" />
                ) : (
                  <Heart
                    className={`h-4 w-4 transition-transform ${
                      isSaved ? "fill-[#E76F51] text-[#E76F51] scale-110" : ""
                    }`}
                  />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {betweenMapAndChartSlot}

      {/* Elevation Profile Section (Flat, no card, no margin/padding) */}
      {isChartVisible ? (
        <div
          className={`relative z-20 border-b p-4 border-[#E5E7EB] ${
            isFullscreen ? "mx-auto w-full max-w-5xl bg-[#FAF6F1]" : ""
          }`}
        >
          {/* Center Circular Toggle Button on the Seam (only in fullscreen) */}
          {isFullscreen && (
            <div className="absolute -top-5 left-1/2 z-30 -translate-x-1/2">
              <button
                type="button"
                onClick={() => setShowChart(false)}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[#2D3436] shadow-md transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95"
                title={t("routeChart.hideChart")}
                aria-label={t("routeChart.hideChart")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <ElevationChart
            trackPoints={trackPoints}
            waypoints={waypoints}
            stats={stats}
            routeName={routeName}
            hoveredPoint={activeHoveredPoint}
            highlightRange={highlightRange}
            onClearHighlight={onClearHighlight}
            onPrevSegment={onPrevSegment}
            onNextSegment={onNextSegment}
            hasPrevSegment={hasPrevSegment}
            hasNextSegment={hasNextSegment}
            currentSegmentLabel={currentSegmentLabel}
            onHover={handleHover}
            embedded
          />
        </div>
      ) : (
        <div className="relative z-20 flex justify-center border-b border-[#E5E7EB] py-3">
          <button
            type="button"
            onClick={() => setShowChart(true)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#D1D5DB] bg-white px-4 py-2 text-xs font-bold text-[#1B4332] shadow-xs transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
            title={t("routeChart.showChart")}
            aria-label={t("routeChart.showChart")}
          >
            <BarChart3 className="h-4 w-4 text-[#E76F51]" />
            <span>{t("routeChart.showChart")}</span>
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  )
}
