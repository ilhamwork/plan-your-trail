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
} from "lucide-react"
import "maplibre-gl/dist/maplibre-gl.css"
import { ElevationChart } from "./ElevationChart"
import { useMaplibreMap } from "./map/useMaplibreMap"

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
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const [is3D, setIs3D] = useState(false)
  const [isSatellite, setIsSatellite] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showChart, setShowChart] = useState(true)

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
  }, [isFullscreen, is3D, mapReady, showChart, resize])

  return (
    <section
      aria-label="Peta Rute dan Profil Elevasi"
      className={`overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-1003 flex flex-col bg-[#1B4332]"
          : "rounded-3xl border border-[#E5E7EB] bg-white shadow-sm"
      }`}
    >
      {/* Spatial Map Stage */}
      <div
        className={`relative w-full ${
          isFullscreen
            ? "min-h-0 flex-1"
            : showChart
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

        {/* Floating Top Controls Overlay (Reference-inspired spatial header) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3 sm:p-4">
          {/* Left: Recenter / Fit Route Button */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleRecenter}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#D1D5DB] bg-white/95 text-[#2D3436] shadow-md transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95"
              title="Pusatkan kembali peta ke seluruh rute"
              aria-label="Pusatkan kembali peta ke seluruh rute"
            >
              <LocateFixed className="h-4 w-4" />
            </button>
          </div>

          {/* Center: Route Title Pill */}
          <div className="pointer-events-auto hidden max-w-xs truncate rounded-full border border-[#D1D5DB] bg-white/95 px-4 py-2 text-xs font-bold text-[#2D3436] shadow-md sm:block">
            {routeName || "Peta Rute Trail"}
          </div>

          {/* Right: 3D, Satellite Layer, and Fullscreen Controls */}
          <div className="pointer-events-auto flex items-center gap-2">
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
        </div>
      </div>

      {/* Docked Bottom Sheet for Elevation Profile (Normal & Fullscreen) */}
      {showChart ? (
        <div
          className={`relative z-20 -mt-6 rounded-t-3xl bg-white pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] ${
            isFullscreen ? "mx-auto w-full max-w-5xl" : ""
          }`}
        >
          {/* Center Circular Toggle Button on the Sheet Seam */}
          <div className="absolute -top-5 left-1/2 z-30 -translate-x-1/2">
            <button
              type="button"
              onClick={() => setShowChart(false)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[#2D3436] shadow-md transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95"
              title="Sembunyikan Profil Elevasi"
              aria-label="Sembunyikan Profil Elevasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ElevationChart
            trackPoints={trackPoints}
            waypoints={waypoints}
            stats={stats}
            routeName={routeName}
            hoveredPoint={activeHoveredPoint}
            highlightRange={highlightRange}
            onClearHighlight={onClearHighlight}
            onHover={handleHover}
            embedded
          />
        </div>
      ) : (
        <div className="relative z-20 -mt-6 flex justify-center rounded-t-3xl bg-white py-3 shadow-[0_-6px_18px_rgba(0,0,0,0.08)]">
          <button
            type="button"
            onClick={() => setShowChart(true)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[#D1D5DB] bg-[#FAF6F1] px-4 py-2 text-xs font-bold text-[#1B4332] shadow-xs transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
            title="Tampilkan Profil Elevasi"
            aria-label="Tampilkan Profil Elevasi"
          >
            <BarChart3 className="h-4 w-4 text-[#E76F51]" />
            <span>Tampilkan Profil Elevasi</span>
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  )
}
