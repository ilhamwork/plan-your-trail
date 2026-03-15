"use client"

import { useEffect, useRef, useState } from "react"
import type { TrackPoint, Waypoint } from "@/lib/types"
import { Map, Globe, Maximize2, Minimize2 } from "lucide-react"
import type L from "leaflet"
import "maplibre-gl/dist/maplibre-gl.css"

interface HighlightRange {
  startIndex: number
  endIndex: number
}

interface MapViewProps {
  trackPoints: TrackPoint[]
  waypoints: Waypoint[]
  bounds: [[number, number], [number, number]]
  hoveredPoint?: TrackPoint | null
  highlightRange?: HighlightRange | null
}

export function MapView({
  trackPoints,
  waypoints,
  bounds,
  hoveredPoint,
  highlightRange,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // ── 2D Map Refs ─────────────────────────────────────────────────
  const leafletMapRef = useRef<L.Map | null>(null)
  const leafletModuleRef = useRef<typeof L | null>(null)
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null)
  const segmentLayerRef = useRef<L.Polyline | null>(null)
  const osmLayerRef = useRef<L.TileLayer | null>(null)
  const satLayerRef = useRef<L.TileLayer | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maplibreMapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maplibreHoverMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maplibreModuleRef = useRef<any>(null)

  const [is3D, setIs3D] = useState(false)
  const [isSatellite, setIsSatellite] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [maplibreReady, setMaplibreReady] = useState(false)

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

  // Store points in a ref so effects always have the latest array without triggering re-renders
  const pointsRef = useRef(trackPoints)
  pointsRef.current = trackPoints

  // ── Initialize 2D Leaflet map ────────────────────────────────────
  useEffect(() => {
    if (is3D || !mapContainerRef.current) return

    let cancelled = false

    ;(async () => {
      const Lf = (await import("leaflet")).default
      leafletModuleRef.current = Lf

      if (cancelled || !mapContainerRef.current) return

      const map = Lf.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      })

      // Tile layers
      const osm = Lf.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }
      )
      const sat = Lf.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "&copy; Esri", maxZoom: 19 }
      )

      osm.addTo(map)
      osmLayerRef.current = osm
      satLayerRef.current = sat

      // Add scale control
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

      // Helper SVG string for markers
      const createMarkerSvg = (color: string) => `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15.014 4 10a8 8 0 0 1 16 0"/>
          <circle cx="12" cy="10" r="3" fill="white"/>
        </svg>
      `

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
            `<strong>Start</strong><br/>${(trackPoints[0].distance / 1000).toFixed(1)} km · ${Math.round(trackPoints[0].ele)}m`,
            {
              permanent: false,
              direction: "top",
              className: "waypoint-tooltip",
              offset: [0, -18],
            }
          )

        // Finish marker
        const last = trackPoints[trackPoints.length - 5]
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
            `<strong>Finish</strong><br/>${(last.distance / 1000).toFixed(1)} km · ${Math.round(last.ele)}m`,
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
          `<strong>${wp.name}</strong><br/>${(wp.distance / 1000).toFixed(1)} km · ${Math.round(wp.ele)}m`,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is3D, trackPoints, waypoints, bounds])

  // ── Toggle satellite layer (2D layer) ─────────────────────────────
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

  // ── Hover marker on 2D map ──────────────────────────────────────
  useEffect(() => {
    const map = leafletMapRef.current
    const Lf = leafletModuleRef.current
    if (!map || !mapReady || is3D || !Lf) return

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
          `${(hoveredPoint.distance / 1000).toFixed(0)} km · ${Math.round(hoveredPoint.ele)}m · ${hoveredPoint.gradient.toFixed(0)}%`,
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
  }, [hoveredPoint, mapReady, is3D])

  // ── Segment highlight on 2D map ─────────────────────────────────
  useEffect(() => {
    const map = leafletMapRef.current
    const Lf = leafletModuleRef.current
    if (!map || !mapReady || is3D || !Lf) return

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
  }, [highlightRange, mapReady, is3D])

  // ── 3D MapLibre map ─────────────────────────────────────────────
  useEffect(() => {
    if (!is3D || !mapContainerRef.current) return

    let cancelled = false

    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !mapContainerRef.current) return

      const map = new maplibregl.Map({
        container: mapContainerRef.current!,
        style: {
          version: 8 as const,
          sources: {
            osm: {
              type: "raster" as const,
              tiles: isSatellite
                ? [
                    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                  ]
                : ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: isSatellite ? "&copy; Esri" : "&copy; OpenStreetMap",
            },
            terrain: {
              type: "raster-dem" as const,
              tiles: [
                "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              encoding: "terrarium",
            },
          },
          layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
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

      // Add Controls
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

        // Helper SVG string for 3D markers
        const createMarkerSvg3D = (color: string, size: number) => `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15.014 4 10a8 8 0 0 1 16 0"/>
            <circle cx="12" cy="10" r="3" fill="white"/>
          </svg>
        `

        // Waypoint markers
        for (const wp of waypoints) {
          const el = document.createElement("div")
          el.style.cursor = "pointer"
          el.innerHTML = createMarkerSvg3D("#3B82F6", 32)

          new maplibregl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([wp.lon, wp.lat])
            .setPopup(
              new maplibregl.Popup({ offset: [0, -20] }).setHTML(
                `<strong>${wp.name}</strong><br/>${(wp.distance / 1000).toFixed(1)} km · ${Math.round(wp.ele)}m`
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
                `<strong>Start</strong><br/>${(trackPoints[0].distance / 1000).toFixed(1)} km · ${Math.round(trackPoints[0].ele)}m`
              )
            )
            .addTo(map)

          const last = trackPoints[trackPoints.length - 10]
          const endEl = document.createElement("div")
          endEl.innerHTML = createMarkerSvg3D("#34e02eff", 32)

          new maplibregl.Marker({ element: endEl, anchor: "bottom" })
            .setLngLat([last.lon, last.lat])
            .setPopup(
              new maplibregl.Popup({ offset: [0, -20] }).setHTML(
                `<strong>Finish</strong><br/>${(last.distance / 1000).toFixed(1)} km · ${Math.round(last.ele)}m`
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
  }, [is3D, isSatellite, trackPoints, waypoints, bounds])

  // ── Hover marker on 3D map ──────────────────────────────────────
  useEffect(() => {
    const map = maplibreMapRef.current
    const ml = maplibreModuleRef.current
    if (!map || !maplibreReady || !is3D || !ml) return

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
              ${(hoveredPoint.distance / 1000).toFixed(0)} km · ${Math.round(hoveredPoint.ele)}m · ${hoveredPoint.gradient.toFixed(0)}%
            </div>`
          )
        )
        .addTo(map)

      marker.togglePopup()
      maplibreHoverMarkerRef.current = marker
    }
  }, [hoveredPoint, maplibreReady, is3D])

  // ── Segment highlight on 3D map ─────────────────────────────────
  useEffect(() => {
    const map = maplibreMapRef.current
    if (!map || !is3D || !maplibreReady) return

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
  }, [highlightRange, maplibreReady, is3D])

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
            className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full ${isFullscreen ? "bg-[#1B4332] text-white hover:bg-[#1B4332]/5 hover:text-[#1B4332]" : "bg-[#1B4332]/5 text-gray-600 hover:bg-[#1B4332] hover:text-white"}`}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <div
        ref={mapContainerRef}
        className={`w-full transition-all duration-300 ${
          isFullscreen ? "h-[calc(100vh-53px)]" : "h-[350px]"
        }`}
        style={{ position: "relative" }}
      />
    </div>
  )
}
