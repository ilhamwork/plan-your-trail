"use client"

import { useEffect, useRef, useState, useCallback, RefObject } from "react"
import type { TrackPoint, Waypoint, HighlightRange } from "@/lib/types"
import { escapeHtml } from "@/lib/html"
import { formatKmLabel, formatElevation } from "@/lib/format"
import { createMarkerSvg3D } from "./markers"
import { TILE_URLS, ATTRIBUTIONS } from "./map-constants"

interface UseMaplibreMapOptions {
  containerRef: RefObject<HTMLDivElement | null>
  is3D?: boolean
  active?: boolean
  trackPoints: TrackPoint[]
  waypoints: Waypoint[]
  bounds: [[number, number], [number, number]]
  isSatellite: boolean
  hoveredPoint?: TrackPoint | null
  highlightRange?: HighlightRange | null
}

export function useMaplibreMap({
  containerRef,
  is3D = false,
  active = true,
  trackPoints,
  waypoints,
  bounds,
  isSatellite,
  hoveredPoint,
  highlightRange,
}: UseMaplibreMapOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maplibreMapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maplibreHoverMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maplibreModuleRef = useRef<any>(null)
  const [maplibreReady, setMaplibreReady] = useState(false)

  const pointsRef = useRef(trackPoints)
  pointsRef.current = trackPoints

  const initialIs3DRef = useRef(is3D)
  const prevIs3DRef = useRef(is3D)
  const initialSatelliteRef = useRef(isSatellite)

  // Initialize MapLibre map (supports both 2D and 3D with 360° rotation)
  useEffect(() => {
    if (!active || !containerRef.current) return

    let cancelled = false

    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !containerRef.current) return

      const startIn3D = initialIs3DRef.current
      const startInSatellite = initialSatelliteRef.current

      const map = new maplibregl.Map({
        container: containerRef.current!,
        style: {
          version: 8 as const,
          sources: {
            osm: {
              type: "raster" as const,
              tiles: [TILE_URLS.osm3D],
              tileSize: 256,
              attribution: ATTRIBUTIONS.osm,
            },
            satellite: {
              type: "raster" as const,
              tiles: [TILE_URLS.satellite],
              tileSize: 256,
              attribution: ATTRIBUTIONS.satellite,
            },
            terrain: {
              type: "raster-dem" as const,
              tiles: [TILE_URLS.terrainDem],
              tileSize: 256,
              encoding: "terrarium",
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster" as const,
              source: "osm",
              layout: { visibility: startInSatellite ? "none" : "visible" },
            },
            {
              id: "satellite",
              type: "raster" as const,
              source: "satellite",
              layout: { visibility: startInSatellite ? "visible" : "none" },
            },
          ],
          terrain: startIn3D
            ? { source: "terrain", exaggeration: 1.5 }
            : undefined,
        },
        center: [
          (bounds[0][1] + bounds[1][1]) / 2,
          (bounds[0][0] + bounds[1][0]) / 2,
        ],
        zoom: 11,
        pitch: startIn3D ? 60 : 0,
        bearing: startIn3D ? -20 : 0,
        maxPitch: startIn3D ? 85 : 0,
        dragRotate: true,
      })

      map.addControl(
        new maplibregl.NavigationControl({ visualizePitch: true }),
        "top-left"
      )
      map.addControl(new maplibregl.ScaleControl(), "bottom-left")

      map.on("load", () => {
        if (cancelled) return

        if (trackPoints.length > 0) {
          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature" as const,
              properties: {},
              geometry: {
                type: "LineString" as const,
                coordinates: trackPoints.map((p) => [p.lon, p.lat, p.ele]),
              },
            },
          })

          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#E76F51",
              "line-width": 4,
              "line-opacity": 0.85,
            },
          })

          // Start marker
          const startEl = document.createElement("div")
          startEl.style.cursor = "pointer"
          startEl.innerHTML = createMarkerSvg3D("#d82020ff", 40)

          const startPopup = new maplibregl.Popup({
            offset: [0, -20],
            closeButton: false,
          })
            .setLngLat([trackPoints[0].lon, trackPoints[0].lat])
            .setHTML(
              `<strong>Start</strong><br/>${formatKmLabel(trackPoints[0].distance)} · ${formatElevation(trackPoints[0].ele)}`
            )

          new maplibregl.Marker({ element: startEl, anchor: "bottom" })
            .setLngLat([trackPoints[0].lon, trackPoints[0].lat])
            .setPopup(startPopup)
            .addTo(map)

          startEl.addEventListener("mouseenter", () => {
            if (!startPopup.isOpen()) startPopup.addTo(map)
          })
          startEl.addEventListener("mouseleave", () => {
            if (startPopup.isOpen()) startPopup.remove()
          })

          // Finish marker
          const last = trackPoints[trackPoints.length - 1]
          const endEl = document.createElement("div")
          endEl.style.cursor = "pointer"
          endEl.innerHTML = createMarkerSvg3D("#34e02eff", 32)

          const endPopup = new maplibregl.Popup({
            offset: [0, -20],
            closeButton: false,
          })
            .setLngLat([last.lon, last.lat])
            .setHTML(
              `<strong>Finish</strong><br/>${formatKmLabel(last.distance)} · ${formatElevation(last.ele)}`
            )

          new maplibregl.Marker({ element: endEl, anchor: "bottom" })
            .setLngLat([last.lon, last.lat])
            .setPopup(endPopup)
            .addTo(map)

          endEl.addEventListener("mouseenter", () => {
            if (!endPopup.isOpen()) endPopup.addTo(map)
          })
          endEl.addEventListener("mouseleave", () => {
            if (endPopup.isOpen()) endPopup.remove()
          })
        }

        // Waypoint markers
        for (const wp of waypoints) {
          const el = document.createElement("div")
          el.style.cursor = "pointer"
          el.innerHTML = createMarkerSvg3D("#3B82F6", 32)

          const popup = new maplibregl.Popup({
            offset: [0, -20],
            closeButton: false,
          })
            .setLngLat([wp.lon, wp.lat])
            .setHTML(
              `<strong>${escapeHtml(wp.name)}</strong><br/>${formatKmLabel(wp.distance)} · ${formatElevation(wp.ele)}`
            )

          new maplibregl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([wp.lon, wp.lat])
            .setPopup(popup)
            .addTo(map)

          el.addEventListener("mouseenter", () => {
            if (!popup.isOpen()) popup.addTo(map)
          })
          el.addEventListener("mouseleave", () => {
            if (popup.isOpen()) popup.remove()
          })
        }

        map.fitBounds(
          [
            [bounds[0][1], bounds[0][0]],
            [bounds[1][1], bounds[1][0]],
          ],
          {
            padding: 50,
            pitch: startIn3D ? 60 : 0,
            bearing: startIn3D ? -20 : 0,
          }
        )

        setMaplibreReady(true)
      })

      maplibreMapRef.current = map
      maplibreModuleRef.current = maplibregl
    })

    return () => {
      cancelled = true
      if (maplibreMapRef.current) {
        maplibreMapRef.current.remove()
        maplibreMapRef.current = null
      }
      maplibreModuleRef.current = null
      maplibreHoverMarkerRef.current = null
      setMaplibreReady(false)
    }
  }, [active, trackPoints, waypoints, bounds, containerRef])

  // Handle 2D <-> 3D transition smoothly without destroying map
  useEffect(() => {
    const map = maplibreMapRef.current
    if (!map || !maplibreReady) return
    if (prevIs3DRef.current === is3D) return
    prevIs3DRef.current = is3D

    if (is3D) {
      map.setMaxPitch(85)
      if (map.touchPitch) map.touchPitch.enable()
      map.setTerrain({ source: "terrain", exaggeration: 1.5 })
      map.easeTo({
        pitch: 60,
        bearing: map.getBearing() === 0 ? -20 : map.getBearing(),
        duration: 800,
      })
    } else {
      if (map.touchPitch) map.touchPitch.disable()
      map.setTerrain(null)
      map.easeTo({
        pitch: 0,
        duration: 800,
      })
      const timer = setTimeout(() => {
        if (!prevIs3DRef.current && maplibreMapRef.current) {
          maplibreMapRef.current.setMaxPitch(0)
        }
      }, 850)
      return () => clearTimeout(timer)
    }
  }, [is3D, maplibreReady])

  // Toggle satellite layer
  useEffect(() => {
    const map = maplibreMapRef.current
    if (!map || !maplibreReady) return

    if (map.getLayer("osm")) {
      map.setLayoutProperty(
        "osm",
        "visibility",
        isSatellite ? "none" : "visible"
      )
    }
    if (map.getLayer("satellite")) {
      map.setLayoutProperty(
        "satellite",
        "visibility",
        isSatellite ? "visible" : "none"
      )
    }
  }, [isSatellite, maplibreReady])

  // Hover marker
  useEffect(() => {
    const map = maplibreMapRef.current
    const ml = maplibreModuleRef.current
    if (!map || !maplibreReady || !ml) return

    if (maplibreHoverMarkerRef.current) {
      maplibreHoverMarkerRef.current.remove()
      maplibreHoverMarkerRef.current = null
    }

    if (hoveredPoint) {
      const el = document.createElement("div")
      el.className = "hover-marker"
      el.style.width = "16px"
      el.style.height = "16px"
      el.style.backgroundColor = "#d82020ff"
      el.style.border = "3px solid white"
      el.style.borderRadius = "50%"
      el.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)"

      const marker = new ml.Marker({ element: el })
        .setLngLat([hoveredPoint.lon, hoveredPoint.lat])
        .setPopup(
          new ml.Popup({
            offset: [0, -10],
            closeButton: false,
            className: "hover-tooltip",
          }).setHTML(
            `<div>
              ${formatKmLabel(hoveredPoint.distance)} · ${formatElevation(hoveredPoint.ele)} · ${hoveredPoint.gradient.toFixed(0)}%
            </div>`
          )
        )
        .addTo(map)

      marker.togglePopup()
      maplibreHoverMarkerRef.current = marker
    }
  }, [hoveredPoint, maplibreReady])

  // Segment highlight
  useEffect(() => {
    const map = maplibreMapRef.current
    if (!map || !maplibreReady) return

    if (map.getLayer("segment-highlight")) {
      map.removeLayer("segment-highlight")
      map.removeSource("segment-highlight")
    }

    if (highlightRange) {
      const segPoints = pointsRef.current.slice(
        highlightRange.startIndex,
        highlightRange.endIndex + 1
      )
      if (segPoints.length < 2) return

      map.addSource("segment-highlight", {
        type: "geojson",
        data: {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: segPoints.map((p) => [p.lon, p.lat, p.ele]),
          },
        },
      })

      map.addLayer({
        id: "segment-highlight",
        type: "line",
        source: "segment-highlight",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#3B82F6",
          "line-width": 8,
          "line-opacity": 0.9,
        },
      })

      const lons = segPoints.map((p) => p.lon)
      const lats = segPoints.map((p) => p.lat)
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        {
          padding: 50,
          pitch: is3D ? 60 : 0,
          bearing: map.getBearing(),
          duration: 1000,
        }
      )
    }
  }, [highlightRange, maplibreReady, is3D])

  const resize = useCallback(() => {
    if (maplibreMapRef.current) {
      maplibreMapRef.current.resize()
    }
  }, [])

  return {
    mapReady: maplibreReady,
    maplibreReady,
    resize,
  }
}
