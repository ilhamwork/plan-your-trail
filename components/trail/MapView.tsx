"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { TrackPoint, Waypoint, Segment } from "@/lib/types";
import { Layers, Globe } from "lucide-react";
import type L from "leaflet";

interface MapViewProps {
  points: TrackPoint[];
  waypoints: Waypoint[];
  bounds: [[number, number], [number, number]];
  hoveredPoint?: TrackPoint | null;
  activeSegment?: Segment | null;
}

export function MapView({
  points,
  waypoints,
  bounds,
  hoveredPoint,
  activeSegment,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maplibreMapRef = useRef<any>(null);
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null);
  const segmentLayerRef = useRef<L.Polyline | null>(null);
  const leafletRef = useRef<typeof L | null>(null);
  const [is3D, setIs3D] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // 2D Leaflet map initialization
  const init2DMap = useCallback(async () => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    const leaflet = (await import("leaflet")).default;
    leafletRef.current = leaflet;

    const map = leaflet.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    // Tile layers
    const osmLayer = leaflet.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }
    );

    const satelliteLayer = leaflet.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "&copy; Esri",
        maxZoom: 19,
      }
    );

    (isSatellite ? satelliteLayer : osmLayer).addTo(map);

    // Store layers for toggling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map as any)._osmLayer = osmLayer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map as any)._satLayer = satelliteLayer;

    // Route polyline
    const routeCoords: [number, number][] = points.map((p) => [p.lat, p.lon]);
    leaflet.polyline(routeCoords, {
      color: "#1B4332",
      weight: 4,
      opacity: 0.85,
    }).addTo(map);

    // Start marker
    if (points.length > 0) {
      const startIcon = leaflet.divIcon({
        className: "custom-marker",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#1B4332;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      leaflet.marker([points[0].lat, points[0].lon], { icon: startIcon }).addTo(map);

      // Finish marker
      const last = points[points.length - 1];
      const finishIcon = leaflet.divIcon({
        className: "custom-marker",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#E76F51;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      leaflet.marker([last.lat, last.lon], { icon: finishIcon }).addTo(map);
    }

    // Waypoint markers
    for (const wp of waypoints) {
      const wpIcon = leaflet.divIcon({
        className: "custom-marker",
        html: `<div style="width:12px;height:12px;border-radius:50%;background:#E76F51;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      const marker = leaflet.marker([wp.lat, wp.lon], { icon: wpIcon }).addTo(map);
      marker.bindTooltip(
        `<strong>${wp.name}</strong><br/>${(wp.distance / 1000).toFixed(1)} km · ${Math.round(wp.ele)}m`,
        {
          permanent: false,
          direction: "top",
          className: "waypoint-tooltip",
          offset: [0, -8],
        }
      );
    }

    // Fit bounds
    map.fitBounds([
      [bounds[0][0], bounds[0][1]],
      [bounds[1][0], bounds[1][1]],
    ], { padding: [30, 30] });

    leafletMapRef.current = map;
    setLeafletLoaded(true);
  }, [points, waypoints, bounds, isSatellite]);

  // Initialize 2D map
  useEffect(() => {
    if (!is3D) {
      init2DMap();
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        setLeafletLoaded(false);
      }
    };
  }, [is3D, init2DMap]);

  // Toggle satellite layer on 2D map
  useEffect(() => {
    if (!leafletMapRef.current || !leafletLoaded) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapAny = leafletMapRef.current as any;
    const osmLayer = mapAny._osmLayer as L.TileLayer;
    const satLayer = mapAny._satLayer as L.TileLayer;
    if (!osmLayer || !satLayer) return;

    const realMap = leafletMapRef.current!;
    if (isSatellite) {
      if (realMap.hasLayer(osmLayer)) realMap.removeLayer(osmLayer);
      if (!realMap.hasLayer(satLayer)) satLayer.addTo(realMap);
    } else {
      if (realMap.hasLayer(satLayer)) realMap.removeLayer(satLayer);
      if (!realMap.hasLayer(osmLayer)) osmLayer.addTo(realMap);
    }
  }, [isSatellite, leafletLoaded]);

  // Hover marker on 2D map
  useEffect(() => {
    if (!leafletMapRef.current || !leafletLoaded || is3D || !leafletRef.current) return;
    const leaflet = leafletRef.current;

    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.remove();
      hoverMarkerRef.current = null;
    }

    if (hoveredPoint) {
      hoverMarkerRef.current = leaflet.circleMarker(
        [hoveredPoint.lat, hoveredPoint.lon],
        {
          radius: 8,
          color: "#E76F51",
          fillColor: "#E76F51",
          fillOpacity: 0.8,
          weight: 3,
        }
      ).addTo(leafletMapRef.current);

      hoverMarkerRef.current.bindTooltip(
        `${(hoveredPoint.distance / 1000).toFixed(1)} km · ${Math.round(hoveredPoint.ele)}m · ${hoveredPoint.gradient.toFixed(1)}%`,
        {
          permanent: true,
          direction: "top",
          className: "hover-tooltip",
          offset: [0, -10],
        }
      ).openTooltip();
    }
  }, [hoveredPoint, leafletLoaded, is3D]);

  // Active segment highlight on 2D map
  useEffect(() => {
    if (!leafletMapRef.current || !leafletLoaded || is3D || !leafletRef.current) return;
    const leaflet = leafletRef.current;

    if (segmentLayerRef.current) {
      segmentLayerRef.current.remove();
      segmentLayerRef.current = null;
    }

    if (activeSegment) {
      const segPoints = points.slice(
        activeSegment.startIndex,
        activeSegment.endIndex + 1
      );
      const coords: [number, number][] = segPoints.map((p) => [p.lat, p.lon]);
      segmentLayerRef.current = leaflet.polyline(coords, {
        color: "#E76F51",
        weight: 6,
        opacity: 0.9,
      }).addTo(leafletMapRef.current);

      leafletMapRef.current.fitBounds(segmentLayerRef.current.getBounds(), {
        padding: [50, 50],
      });
    }
  }, [activeSegment, points, leafletLoaded, is3D]);

  // 3D MapLibre map
  useEffect(() => {
    if (!is3D || !mapContainerRef.current) return;

    import("maplibre-gl").then((maplibregl) => {
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
              attribution: isSatellite
                ? "&copy; Esri"
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
          layers: [
            {
              id: "osm",
              type: "raster" as const,
              source: "osm",
            },
          ],
          terrain: {
            source: "terrain",
            exaggeration: 1.5,
          },
        },
        center: [
          (bounds[0][1] + bounds[1][1]) / 2,
          (bounds[0][0] + bounds[1][0]) / 2,
        ],
        zoom: 11,
        pitch: 60,
        bearing: -20,
        maxPitch: 85,
      });

      map.on("load", () => {
        // Add route line
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
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#1B4332",
            "line-width": 4,
            "line-opacity": 0.85,
          },
        });

        // Waypoint markers
        for (const wp of waypoints) {
          const el = document.createElement("div");
          el.style.width = "12px";
          el.style.height = "12px";
          el.style.borderRadius = "50%";
          el.style.background = "#E76F51";
          el.style.border = "2px solid white";
          el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";

          new maplibregl.Marker({ element: el })
            .setLngLat([wp.lon, wp.lat])
            .setPopup(
              new maplibregl.Popup({ offset: 10 }).setHTML(
                `<strong>${wp.name}</strong><br/>${(wp.distance / 1000).toFixed(1)} km · ${Math.round(wp.ele)}m`
              )
            )
            .addTo(map);
        }

        // Fit bounds
        map.fitBounds(
          [
            [bounds[0][1], bounds[0][0]],
            [bounds[1][1], bounds[1][0]],
          ],
          { padding: 50, pitch: 60, bearing: -20 }
        );
      });

      maplibreMapRef.current = map;
    });

    return () => {
      if (maplibreMapRef.current) {
        maplibreMapRef.current.remove();
        maplibreMapRef.current = null;
      }
    };
  }, [is3D, isSatellite, points, waypoints, bounds]);

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#1B4332]" />
          <h3 className="text-sm font-bold text-[#2D3436]">Route Map</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* 3D Toggle */}
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
          {/* Satellite Toggle */}
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

      {/* Map container */}
      <div
        ref={mapContainerRef}
        className="h-[350px] w-full lg:h-[450px]"
        style={{ position: "relative" }}
      />
    </div>
  );
}
