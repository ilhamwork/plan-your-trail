"use client"

import { useEffect, useRef, useState, useCallback, RefObject } from "react"
import type { TrackPoint, Waypoint, HighlightRange } from "@/lib/types"
import { escapeHtml } from "@/lib/html"
import { formatKmLabel, formatElevation } from "@/lib/format"
import { createMarkerSvg3D } from "./markers"
import { TILE_URLS, ATTRIBUTIONS } from "./map-constants"

interface UseMaplibreMapOptions {
  containerRef: RefObject<HTMLDivElement | null>
  active: boolean
  trackPoints: TrackPoint[]
  waypoints: Waypoint[]
  bounds: [[number, number], [number, number]]
  isSatellite: boolean
  hoveredPoint?: TrackPoint | null
  highlightRange?: HighlightRange | null
}

export function useMaplibreMap({
  containerRef,
  active,
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

  // Initialize 3D MapLibre map
  useEffect(() => {
    if (!active || !containerRef.current) return

    let cancelled = false

    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !containerRef.current) return

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
              layout: { visibility: isSatellite ? "none" : "visible" },
            },
            {
              id: "satellite",
              type: "raster" as const,
              source: "satellite",
              layout: { visibility: isSatellite ? "visible" : "none" },
            },
          ],
          terrain: { source: "terrain", exaggeration: 1.5 },
        },
        center: [
          (bounds[0][1] + bounds[1][1]) / 2,
          (bounds[0][0] + bounds[1][0]) / 2,
        ],
        zoom: 11,
        pitch: 60,
        bearing: -20,
        maxPitch: 85,
      })

      map.addControl(new maplibregl.NavigationControl(), "top-left")
      map.addControl(new maplibregl.ScaleControl(), "bottom-left")

      map.on("load", () => {
        if (cancelled) return

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

        // Waypoint markers
        for (const wp of waypoints) {
          const el = document.createElement("div")
          el.style.cursor = "pointer"
          el.innerHTML = createMarkerSvg3D("#3B82F6", 32)

          new maplibregl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([wp.lon, wp.lat])
            .setPopup(
              new maplibregl.Popup({ offset: [0, -20] }).setHTML(
                `<strong>${escapeHtml(wp.name)}</strong><br/>${formatKmLabel(wp.distance)} · ${formatElevation(wp.ele)}`
              )
            )
            .addTo(map)
        }

        // Start marker
        if (trackPoints.length > 0) {
          const startEl = document.createElement("div")
          startEl.innerHTML = createMarkerSvg3D("#d82020ff", 40)

          new maplibregl.Marker({ element: startEl, anchor: "bottom" })
            .setLngLat([trackPoints[0].lon, trackPoints[0].lat])
            .setPopup(
              new maplibregl.Popup({ offset: [0, -20] }).setHTML(
                `<strong>Start</strong><br/>${formatKmLabel(trackPoints[0].distance)} · ${formatElevation(trackPoints[0].ele)}`
              )
            )
            .addTo(map)

          const last = trackPoints[trackPoints.length - 1]
          const endEl = document.createElement("div")
          endEl.innerHTML = createMarkerSvg3D("#34e02eff", 32)

          new maplibregl.Marker({ element: endEl, anchor: "bottom" })
            .setLngLat([last.lon, last.lat])
            .setPopup(
              new maplibregl.Popup({ offset: [0, -20] }).setHTML(
                `<strong>Finish</strong><br/>${formatKmLabel(last.distance)} · ${formatElevation(last.ele)}`
              )
            )
            .addTo(map)
        }

        map.fitBounds(
          [
            [bounds[0][1], bounds[0][0]],
            [bounds[1][1], bounds[1][0]],
          ],
          { padding: 50, pitch: 60, bearing: -20 }
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
  }, [active, trackPoints, waypoints, bounds, containerRef, isSatellite])

  // Toggle satellite layer
  useEffect(() => {
    const map = maplibreMapRef.current
    if (!map || !maplibreReady || !active) return

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
  }, [isSatellite, maplibreReady, active])

  // Hover marker
  useEffect(() => {
    const map = maplibreMapRef.current
    const ml = maplibreModuleRef.current
    if (!map || !maplibreReady || !active || !ml) return

    if (maplibreHoverMarkerRef.current) {
      maplibreHoverMarkerRef.current.remove()
      maplibreHoverMarkerRef.current = null
    }

    if (hoveredPoint) {
      const el = document.createElement("div")
      el.className = "hover-marker-3d"
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
            className: "hover-tooltip-3d",
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
  }, [hoveredPoint, maplibreReady, active])

  // Segment highlight
  useEffect(() => {
    const map = maplibreMapRef.current
    if (!map || !active || !maplibreReady) return

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
        { padding: 50, pitch: 60, bearing: -20, duration: 1000 }
      )
    }
  }, [highlightRange, maplibreReady, active])

  const resize = useCallback(() => {
    if (maplibreMapRef.current) {
      maplibreMapRef.current.resize()
    }
  }, [])

  return {
    maplibreReady,
    resize,
  }
}
