"use client"

import { useEffect, useRef, useState, useCallback, RefObject } from "react"
import type L from "leaflet"
import type { TrackPoint, Waypoint, HighlightRange } from "@/lib/types"
import { escapeHtml } from "@/lib/html"
import { formatKmLabel, formatElevation } from "@/lib/format"
import { createMarkerSvg } from "./markers"
import { TILE_URLS, ATTRIBUTIONS } from "./map-constants"

interface UseLeafletMapOptions {
  containerRef: RefObject<HTMLDivElement | null>
  active: boolean
  trackPoints: TrackPoint[]
  waypoints: Waypoint[]
  bounds: [[number, number], [number, number]]
  isSatellite: boolean
  hoveredPoint?: TrackPoint | null
  highlightRange?: HighlightRange | null
}

export function useLeafletMap({
  containerRef,
  active,
  trackPoints,
  waypoints,
  bounds,
  isSatellite,
  hoveredPoint,
  highlightRange,
}: UseLeafletMapOptions) {
  const leafletMapRef = useRef<L.Map | null>(null)
  const leafletModuleRef = useRef<typeof L | null>(null)
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null)
  const segmentLayerRef = useRef<L.Polyline | null>(null)
  const osmLayerRef = useRef<L.TileLayer | null>(null)
  const satLayerRef = useRef<L.TileLayer | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const pointsRef = useRef(trackPoints)
  pointsRef.current = trackPoints

  // Initialize 2D Leaflet map
  useEffect(() => {
    if (!active || !containerRef.current) return

    let cancelled = false

    ;(async () => {
      const Lf = (await import("leaflet")).default
      leafletModuleRef.current = Lf

      if (cancelled || !containerRef.current) return

      const map = Lf.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      })

      const osm = Lf.tileLayer(TILE_URLS.osm, {
        attribution: ATTRIBUTIONS.osm,
        maxZoom: 19,
      })
      const sat = Lf.tileLayer(TILE_URLS.satellite, {
        attribution: ATTRIBUTIONS.satellite,
        maxZoom: 19,
      })

      osm.addTo(map)
      osmLayerRef.current = osm
      satLayerRef.current = sat

      Lf.control.scale({ position: "bottomleft" }).addTo(map)

      // Route polyline — ORANGE
      const routeCoords: [number, number][] = trackPoints.map((p) => [
        p.lat,
        p.lon,
      ])
      Lf.polyline(routeCoords, {
        color: "#E76F51",
        weight: 4,
        opacity: 0.85,
      }).addTo(map)

      // Start marker
      if (trackPoints.length > 0) {
        Lf.marker([trackPoints[0].lat, trackPoints[0].lon], {
          icon: Lf.divIcon({
            className: "custom-marker",
            html: `<div style="width:32px;height:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${createMarkerSvg("#d82020ff")}</div>`,
            iconSize: [32, 32],
            iconAnchor: [10, 20],
          }),
        })
          .addTo(map)
          .bindTooltip(
            `<strong>Start</strong><br/>${formatKmLabel(trackPoints[0].distance)} · ${formatElevation(trackPoints[0].ele)}`,
            {
              permanent: false,
              direction: "top",
              className: "waypoint-tooltip",
              offset: [0, -18],
            }
          )

        // Finish marker
        const last = trackPoints[trackPoints.length - 1]
        Lf.marker([last.lat, last.lon], {
          icon: Lf.divIcon({
            className: "custom-marker",
            html: `<div style="width:32px;height:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${createMarkerSvg("#34e02eff")}</div>`,
            iconSize: [32, 32],
            iconAnchor: [10, 20],
          }),
        })
          .addTo(map)
          .bindTooltip(
            `<strong>Finish</strong><br/>${formatKmLabel(last.distance)} · ${formatElevation(last.ele)}`,
            {
              permanent: false,
              direction: "top",
              className: "waypoint-tooltip",
              offset: [0, -18],
            }
          )
      }

      // Waypoint markers
      for (const wp of waypoints) {
        const marker = Lf.marker([wp.lat, wp.lon], {
          icon: Lf.divIcon({
            className: "custom-marker",
            html: `<div style="width:32px;height:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${createMarkerSvg("#3B82F6")}</div>`,
            iconSize: [32, 32],
            iconAnchor: [10, 20],
          }),
        }).addTo(map)
        marker.bindTooltip(
          `<strong>${escapeHtml(wp.name)}</strong><br/>${formatKmLabel(wp.distance)} · ${formatElevation(wp.ele)}`,
          {
            permanent: false,
            direction: "top",
            className: "waypoint-tooltip",
            offset: [0, -18],
          }
        )
      }

      // Fit bounds
      map.fitBounds(
        [
          [bounds[0][0], bounds[0][1]],
          [bounds[1][0], bounds[1][1]],
        ],
        { padding: [30, 30] }
      )

      leafletMapRef.current = map
      setMapReady(true)
    })()

    return () => {
      cancelled = true
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
      hoverMarkerRef.current = null
      segmentLayerRef.current = null
      osmLayerRef.current = null
      satLayerRef.current = null
      setMapReady(false)
    }
  }, [active, trackPoints, waypoints, bounds, containerRef])

  // Toggle satellite layer
  useEffect(() => {
    const map = leafletMapRef.current
    const osm = osmLayerRef.current
    const sat = satLayerRef.current
    if (!map || !osm || !sat || !mapReady) return

    if (isSatellite) {
      if (map.hasLayer(osm)) map.removeLayer(osm)
      if (!map.hasLayer(sat)) sat.addTo(map)
    } else {
      if (map.hasLayer(sat)) map.removeLayer(sat)
      if (!map.hasLayer(osm)) osm.addTo(map)
    }
  }, [isSatellite, mapReady])

  // Hover marker
  useEffect(() => {
    const map = leafletMapRef.current
    const Lf = leafletModuleRef.current
    if (!map || !mapReady || !active || !Lf) return

    if (hoverMarkerRef.current) {
      map.removeLayer(hoverMarkerRef.current)
      hoverMarkerRef.current = null
    }

    if (hoveredPoint) {
      const marker = Lf.circleMarker([hoveredPoint.lat, hoveredPoint.lon], {
        radius: 8,
        color: "#fff",
        fillColor: "#d82020ff",
        fillOpacity: 0.9,
        weight: 3,
      }).addTo(map)

      marker
        .bindTooltip(
          `${formatKmLabel(hoveredPoint.distance)} · ${formatElevation(hoveredPoint.ele)} · ${hoveredPoint.gradient.toFixed(0)}%`,
          {
            permanent: true,
            direction: "top",
            className: "hover-tooltip",
            offset: [0, -10],
          }
        )
        .openTooltip()

      hoverMarkerRef.current = marker
    }
  }, [hoveredPoint, mapReady, active])

  // Segment highlight
  useEffect(() => {
    const map = leafletMapRef.current
    const Lf = leafletModuleRef.current
    if (!map || !mapReady || !active || !Lf) return

    if (segmentLayerRef.current) {
      map.removeLayer(segmentLayerRef.current)
      segmentLayerRef.current = null
    }

    if (highlightRange) {
      const pts = pointsRef.current
      const segPoints = pts.slice(
        highlightRange.startIndex,
        highlightRange.endIndex + 1
      )
      if (segPoints.length < 2) return

      const coords: [number, number][] = segPoints.map((p) => [p.lat, p.lon])
      const line = Lf.polyline(coords, {
        color: "#3B82F6",
        weight: 7,
        opacity: 0.95,
      }).addTo(map)

      map.fitBounds(line.getBounds(), { padding: [50, 50] })
      segmentLayerRef.current = line
    }
  }, [highlightRange, mapReady, active])

  const invalidateSize = useCallback(() => {
    if (leafletMapRef.current) {
      leafletMapRef.current.invalidateSize()
    }
  }, [])

  return {
    mapReady,
    invalidateSize,
  }
}
