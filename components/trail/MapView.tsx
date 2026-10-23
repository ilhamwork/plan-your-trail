"use client"

import { useEffect, useRef, useState } from "react"
import type { TrackPoint, Waypoint, HighlightRange } from "@/lib/types"
import { Map, Globe, Maximize2, Minimize2, BarChart3 } from "lucide-react"
import "maplibre-gl/dist/maplibre-gl.css"
import { ElevationChart } from "./ElevationChart"
import { useLeafletMap } from "./map/useLeafletMap"
import { useMaplibreMap } from "./map/useMaplibreMap"

interface MapViewProps {
  trackPoints: TrackPoint[]
  waypoints: Waypoint[]
  bounds: [[number, number], [number, number]]
  hoveredPoint?: TrackPoint | null
  highlightRange?: HighlightRange | null
  onHover?: (point: TrackPoint | null) => void
}

export function MapView({
  trackPoints,
  waypoints,
  bounds,
  hoveredPoint,
  highlightRange,
  onHover,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const [is3D, setIs3D] = useState(false)
  const [isSatellite, setIsSatellite] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showChart, setShowChart] = useState(true)

  // 2D Leaflet map subsystem
  const { mapReady, invalidateSize } = useLeafletMap({
    containerRef: mapContainerRef,
    active: !is3D,
    trackPoints,
    waypoints,
    bounds,
    isSatellite,
    hoveredPoint,
    highlightRange,
  })

  // 3D MapLibre map subsystem
  const { maplibreReady, resize } = useMaplibreMap({
    containerRef: mapContainerRef,
    active: is3D,
    trackPoints,
    waypoints,
    bounds,
    isSatellite,
    hoveredPoint,
    highlightRange,
  })

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
      if (is3D) {
        resize()
      } else {
        invalidateSize()
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [isFullscreen, is3D, maplibreReady, mapReady, showChart, resize, invalidateSize])

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-1003 bg-[#FAF6F1]"
          : "rounded-xl border border-gray-100 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-[#2A9D8F]" />
          <h3 className="text-sm font-bold text-[#2D3436]">Route Map</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIs3D(!is3D)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              is3D
                ? "bg-[#1B4332] text-white hover:bg-[#1B4332]/5 hover:text-[#1B4332]"
                : "bg-[#1B4332]/5 text-gray-600 hover:bg-[#1B4332] hover:text-white"
            }`}
          >
            <Globe className="h-3 w-3" />
            3D
          </button>
          <button
            onClick={() => setIsSatellite(!isSatellite)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all ${
              isSatellite
                ? "bg-[#1B4332] text-white hover:bg-[#1B4332]/5 hover:text-[#1B4332]"
                : "bg-[#1B4332]/5 text-gray-600 hover:bg-[#1B4332] hover:text-white"
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full ${
              isFullscreen
                ? "bg-[#1B4332] text-white hover:bg-[#1B4332]/5 hover:text-[#1B4332]"
                : "bg-[#1B4332]/5 text-gray-600 hover:bg-[#1B4332] hover:text-white"
            }`}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>

          {isFullscreen && (
            <button
              onClick={() => setShowChart(!showChart)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                showChart
                  ? "bg-[#1B4332] text-white hover:bg-[#1B4332]/5 hover:text-[#1B4332]"
                  : "bg-[#1B4332]/5 text-gray-600 hover:bg-[#1B4332] hover:text-white"
              }`}
            >
              <BarChart3 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className={`w-full transition-all duration-300 ${
          isFullscreen ? "h-[calc(100vh-53px)]" : "h-[350px]"
        }`}
        style={{ position: "relative" }}
      />

      {isFullscreen && showChart && (
        <div className="absolute bottom-12 left-1/2 z-1000 w-[95%] -translate-x-1/2 overflow-hidden rounded-xl border border-white/20 bg-[#2D3436]/80 shadow-2xl lg:w-3/4">
          <div className="flex flex-col gap-2">
            <div className="h-[180px]">
              <ElevationChart
                trackPoints={trackPoints}
                waypoints={waypoints}
                onHover={onHover || (() => {})}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
