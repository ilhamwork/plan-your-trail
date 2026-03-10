"use client";

import { useEffect, useRef, useState } from "react";
import type { TrackPoint, Waypoint } from "@/lib/types";
import { Layers, Globe } from "lucide-react";
import type L from "leaflet";

interface HighlightRange {
  startIndex: number;
  endIndex: number;
}

interface MapViewProps {
  points: TrackPoint[];
  waypoints: Waypoint[];
  bounds: [[number, number], [number, number]];
  hoveredPoint?: TrackPoint | null;
  highlightRange?: HighlightRange | null;
}

export function MapView({
  points,
  waypoints,
  bounds,
  hoveredPoint,
  highlightRange,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // ── 2D Map Refs ─────────────────────────────────────────────────
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletModuleRef = useRef<typeof L | null>(null);
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null);
  const segmentLayerRef = useRef<L.Polyline | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satLayerRef = useRef<L.TileLayer | null>(null);
  
  // ── 3D Map Refs ─────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maplibreMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hoverMarker3DRef = useRef<any>(null);

  const [is3D, setIs3D] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [maplibreReady, setMaplibreReady] = useState(false);

  // Store points in a ref so effects always have the latest array without triggering re-renders
  const pointsRef = useRef(points);
  pointsRef.current = points;

  // ── Initialize 2D Leaflet map ────────────────────────────────────
  useEffect(() => {
    if (is3D || !mapContainerRef.current) return;

    let cancelled = false;

    (async () => {
      const Lf = (await import("leaflet")).default;
      leafletModuleRef.current = Lf;

      if (cancelled || !mapContainerRef.current) return;

      const map = Lf.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      });

      // Tile layers
      const osm = Lf.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }
      );
      const sat = Lf.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "&copy; Esri", maxZoom: 19 }
      );

      osm.addTo(map);
      osmLayerRef.current = osm;
      satLayerRef.current = sat;

      // Route polyline — ORANGE
      const routeCoords: [number, number][] = points.map((p) => [p.lat, p.lon]);
      Lf.polyline(routeCoords, {
        color: "#E76F51",
        weight: 4,
        opacity: 0.85,
      }).addTo(map);

      // Helper SVG string for markers
      const createMarkerSvg = (color: string) => `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15.014 4 10a8 8 0 0 1 16 0"/>
          <circle cx="12" cy="10" r="3" fill="white"/>
        </svg>
      `;

      // Start marker (green)
      if (points.length > 0) {
        Lf.marker([points[0].lat, points[0].lon], {
          icon: Lf.divIcon({
            className: "custom-marker",
            html: `<div style="width:24px;height:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${createMarkerSvg("#34e02eff")}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
          }),
        }).addTo(map);

        // Finish marker
        const last = points[points.length - 1];
        Lf.marker([last.lat, last.lon], {
          icon: Lf.divIcon({
            className: "custom-marker",
            html: `<div style="width:24px;height:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${createMarkerSvg("#34e02eff")}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
          }),
        }).addTo(map);
      }

      // Waypoint markers
      for (const wp of waypoints) {
        const marker = Lf.marker([wp.lat, wp.lon], {
          icon: Lf.divIcon({
            className: "custom-marker",
            html: `<div style="width:24px;height:24px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.3))">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#3B82F6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15.014 4 10a8 8 0 0 1 16 0"/>
                <circle cx="12" cy="10" r="3" fill="white"/>
              </svg>
            </div>`,
            iconSize: [24, 24],
            iconAnchor: [10, 20],
          }),
        }).addTo(map);
        marker.bindTooltip(
          `<strong>${wp.name}</strong><br/>${(wp.distance / 1000).toFixed(1)} km · ${Math.round(wp.ele)}m`,
          { permanent: false, direction: "top", className: "waypoint-tooltip", offset: [0, -18] }
        );
      }

      // Fit bounds
      map.fitBounds(
        [[bounds[0][0], bounds[0][1]], [bounds[1][0], bounds[1][1]]],
        { padding: [30, 30] }
      );

      leafletMapRef.current = map;
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      hoverMarkerRef.current = null;
      segmentLayerRef.current = null;
      osmLayerRef.current = null;
      satLayerRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is3D]);

  // ── Toggle satellite layer (2D layer) ─────────────────────────────
  useEffect(() => {
    const map = leafletMapRef.current;
    const osm = osmLayerRef.current;
    const sat = satLayerRef.current;
    if (!map || !osm || !sat || !mapReady) return;

    if (isSatellite) {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(sat)) sat.addTo(map);
    } else {
      if (map.hasLayer(sat)) map.removeLayer(sat);
      if (!map.hasLayer(osm)) osm.addTo(map);
    }
  }, [isSatellite, mapReady]);

  // ── Hover marker on 2D map ──────────────────────────────────────
  useEffect(() => {
    const map = leafletMapRef.current;
    const Lf = leafletModuleRef.current;
    if (!map || !mapReady || is3D || !Lf) return;

    if (hoverMarkerRef.current) {
      map.removeLayer(hoverMarkerRef.current);
      hoverMarkerRef.current = null;
    }

    if (hoveredPoint) {
      const marker = Lf.circleMarker(
        [hoveredPoint.lat, hoveredPoint.lon],
        {
          radius: 8,
          color: "#3B82F6",
          fillColor: "#3B82F6",
          fillOpacity: 0.9,
          weight: 3,
        }
      ).addTo(map);

      marker
        .bindTooltip(
          `${(hoveredPoint.distance / 1000).toFixed(1)} km · ${Math.round(hoveredPoint.ele)}m · ${hoveredPoint.gradient.toFixed(1)}%`,
          {
            permanent: true,
            direction: "top",
            className: "hover-tooltip",
            offset: [0, -10],
          }
        )
        .openTooltip();

      hoverMarkerRef.current = marker;
    }
  }, [hoveredPoint, mapReady, is3D]);

  // ── Segment highlight on 2D map ─────────────────────────────────
  useEffect(() => {
    const map = leafletMapRef.current;
    const Lf = leafletModuleRef.current;
    if (!map || !mapReady || is3D || !Lf) return;

    if (segmentLayerRef.current) {
      map.removeLayer(segmentLayerRef.current);
      segmentLayerRef.current = null;
    }

    if (highlightRange) {
      const pts = pointsRef.current;
      const segPoints = pts.slice(
        highlightRange.startIndex,
        highlightRange.endIndex + 1
      );
      if (segPoints.length < 2) return;

      const coords: [number, number][] = segPoints.map((p) => [p.lat, p.lon]);
      const line = Lf.polyline(coords, {
        color: "#3B82F6",
        weight: 7,
        opacity: 0.95,
      }).addTo(map);

      map.fitBounds(line.getBounds(), { padding: [50, 50] });
      segmentLayerRef.current = line;
    }
  }, [highlightRange, mapReady, is3D]);

  // ── 3D MapLibre map ─────────────────────────────────────────────
  useEffect(() => {
    if (!is3D || !mapContainerRef.current) return;

    let cancelled = false;

    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !mapContainerRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current!,
        style: {
          version: 8 as const,
          sources: {
            osm: {
              type: "raster" as const,
              tiles: isSatellite
                ? ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"]
                : ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: isSatellite
                ? "&copy; Esri"
                : '&copy; OpenStreetMap',
            },
            terrain: {
              type: "raster-dem" as const,
              tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
              tileSize: 256,
              encoding: "terrarium",
            },
          },
          layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
          terrain: { source: "terrain", exaggeration: 1.5 },
        },
        center: [(bounds[0][1] + bounds[1][1]) / 2, (bounds[0][0] + bounds[1][0]) / 2],
        zoom: 11,
        pitch: 60,
        bearing: -20,
        maxPitch: 85,
      });

      map.on("load", () => {
        if (cancelled) return;

        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "LineString" as const,
              coordinates: points.map((p) => [p.lon, p.lat, p.ele]),
            },
          },
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#E76F51", "line-width": 4, "line-opacity": 0.85 },
        });

        // Helper SVG string for 3D markers
        const createMarkerSvg3D = (color: string, size: number) => `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15.014 4 10a8 8 0 0 1 16 0"/>
            <circle cx="12" cy="10" r="3" fill="white"/>
          </svg>
        `;

        // Waypoint markers
        for (const wp of waypoints) {
          const el = document.createElement("div");
          el.style.cursor = "pointer";
          el.innerHTML = createMarkerSvg3D("#3B82F6", 20);
            
          new maplibregl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([wp.lon, wp.lat])
            .setPopup(
              new maplibregl.Popup({ offset: [0, -20] }).setHTML(
                `<strong>${wp.name}</strong><br/>${(wp.distance / 1000).toFixed(1)} km · ${Math.round(wp.ele)}m`
              )
            )
            .addTo(map);
        }

        // Start marker
        if (points.length > 0) {
          const startEl = document.createElement("div");
          startEl.innerHTML = createMarkerSvg3D("#34e02eff", 24);
            
          new maplibregl.Marker({ element: startEl, anchor: "bottom" })
            .setLngLat([points[0].lon, points[0].lat])
            .addTo(map);

          const last = points[points.length - 1];
          const endEl = document.createElement("div");
          endEl.innerHTML = createMarkerSvg3D("#34e02eff", 24);
            
          new maplibregl.Marker({ element: endEl, anchor: "bottom" })
            .setLngLat([last.lon, last.lat])
            .addTo(map);
        }

        map.fitBounds(
          [[bounds[0][1], bounds[0][0]], [bounds[1][1], bounds[1][0]]],
          { padding: 50, pitch: 60, bearing: -20 }
        );

        setMaplibreReady(true);
      });

      maplibreMapRef.current = map;
    });

    return () => {
      cancelled = true;
      if (maplibreMapRef.current) {
        maplibreMapRef.current.remove();
        maplibreMapRef.current = null;
      }
      setMaplibreReady(false);
    };
  }, [is3D, isSatellite, points, waypoints, bounds]);

  // ── Hover marker on 3D map ──────────────────────────────────────
  useEffect(() => {
    const map = maplibreMapRef.current;
    if (!map || !is3D || !maplibreReady) return;

    if (hoverMarker3DRef.current) {
      hoverMarker3DRef.current.remove();
      hoverMarker3DRef.current = null;
    }

    if (hoveredPoint) {
      import("maplibre-gl").then((maplibregl) => {
        const el = document.createElement("div");
        el.style.cssText =
          "display:block;width:12px;height:12px;border-radius:50%;background:#3B82F6;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);position:relative;z-index:50;";
        
        hoverMarker3DRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([hoveredPoint.lon, hoveredPoint.lat])
          .addTo(map);
      });
    }
  }, [hoveredPoint, maplibreReady, is3D]);

  // ── Segment highlight on 3D map ─────────────────────────────────
  useEffect(() => {
    const map = maplibreMapRef.current;
    if (!map || !is3D || !maplibreReady) return;

    if (map.getLayer("segment-highlight")) {
      map.removeLayer("segment-highlight");
      map.removeSource("segment-highlight");
    }

    if (highlightRange) {
      const segPoints = pointsRef.current.slice(
        highlightRange.startIndex,
        highlightRange.endIndex + 1
      );
      if (segPoints.length < 2) return;

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
      });

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
      });

      const lons = segPoints.map((p) => p.lon);
      const lats = segPoints.map((p) => p.lat);
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 50, pitch: 60, bearing: -20, duration: 1000 }
      );
    }
  }, [highlightRange, maplibreReady, is3D]);

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#1B4332]" />
          <h3 className="text-sm font-bold text-[#2D3436]">Route Map</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIs3D(!is3D)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              is3D
                ? "bg-[#1B4332] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Globe className="h-3 w-3" />
            3D
          </button>
          <button
            onClick={() => setIsSatellite(!isSatellite)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              isSatellite
                ? "bg-[#1B4332] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Satellite
          </button>
        </div>
      </div>
      <div
        ref={mapContainerRef}
        className="h-[350px] w-full lg:h-[450px]"
        style={{ position: "relative" }}
      />
    </div>
  );
}
