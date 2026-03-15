import * as toGeoJSON from "@mapbox/togeojson";
import type {
  TrackPoint,
  Waypoint,
  RouteStats,
  GPXData,
} from "./types";
import { analyzeSegments, buildWaypointSegments } from "./segment-analysis";

// ─── Haversine distance ────────────────────────────────────────────
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Smooth elevation data ─────────────────────────────────────────
function smoothElevation(elevations: number[], windowSize: number = 5): number[] {
  const half = Math.floor(windowSize / 2);
  return elevations.map((_, i, arr) => {
    const start = Math.max(0, i - half);
    const end = Math.min(arr.length - 1, i + half);
    let sum = 0;
    for (let j = start; j <= end; j++) sum += arr[j];
    return sum / (end - start + 1);
  });
}

// ─── Parse GPX string ──────────────────────────────────────────────
export function parseGPX(gpxString: string): GPXData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxString, "text/xml");

  // Check for parse errors
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX file: Could not parse XML");
  }

  const geoJSON = toGeoJSON.gpx(doc);

  // Extract track points from GeoJSON
  const rawPoints: { lat: number; lon: number; ele: number }[] = [];

  for (const feature of geoJSON.features) {
    if (
      feature.geometry.type === "LineString" ||
      feature.geometry.type === "MultiLineString"
    ) {
      const coordArrays =
        feature.geometry.type === "MultiLineString"
          ? feature.geometry.coordinates
          : [feature.geometry.coordinates];

      for (const coords of coordArrays) {
        for (const coord of coords) {
          rawPoints.push({
            lon: coord[0],
            lat: coord[1],
            ele: coord[2] ?? 0,
          });
        }
      }
    }
  }

  if (rawPoints.length < 2) {
    throw new Error(
      "Invalid GPX file: Track must contain at least 2 points"
    );
  }

  // Smooth elevation data
  const smoothedEle = smoothElevation(rawPoints.map((p) => p.ele));

  // Build track points with cumulative distance and gradient
  const trackPoints: TrackPoint[] = [];
  let cumulativeDistance = 0;

  for (let i = 0; i < rawPoints.length; i++) {
    if (i > 0) {
      cumulativeDistance += haversineDistance(
        rawPoints[i - 1].lat,
        rawPoints[i - 1].lon,
        rawPoints[i].lat,
        rawPoints[i].lon
      );
    }

    const gradient =
      i > 0
        ? (() => {
            const dist = haversineDistance(
              rawPoints[i - 1].lat,
              rawPoints[i - 1].lon,
              rawPoints[i].lat,
              rawPoints[i].lon
            );
            if (dist < 0.1) return 0;
            return ((smoothedEle[i] - smoothedEle[i - 1]) / dist) * 100;
          })()
        : 0;

    trackPoints.push({
      lat: rawPoints[i].lat,
      lon: rawPoints[i].lon,
      ele: smoothedEle[i],
      distance: cumulativeDistance,
      gradient: Math.max(-50, Math.min(50, gradient)), // clamp to ±50%
    });
  }

  // Calculate stats
  let elevationGain = 0;
  let elevationLoss = 0;
  let highestPoint = -Infinity;
  let lowestPoint = Infinity;

  for (let i = 0; i < trackPoints.length; i++) {
    if (trackPoints[i].ele > highestPoint) highestPoint = trackPoints[i].ele;
    if (trackPoints[i].ele < lowestPoint) lowestPoint = trackPoints[i].ele;

    if (i > 0) {
      const diff = trackPoints[i].ele - trackPoints[i - 1].ele;
      if (diff > 0) elevationGain += diff;
      else elevationLoss += Math.abs(diff);
    }
  }

  // Extract named waypoints from GPX
  const wptElements = doc.querySelectorAll("wpt");
  const waypoints: Waypoint[] = [];

  wptElements.forEach((wpt) => {
    const lat = parseFloat(wpt.getAttribute("lat") || "0");
    const lon = parseFloat(wpt.getAttribute("lon") || "0");
    const ele = parseFloat(wpt.querySelector("ele")?.textContent || "0");
    const name = wpt.querySelector("name")?.textContent || "Waypoint";

    // Find closest point on track
    let minDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < trackPoints.length; i++) {
      const d = haversineDistance(lat, lon, trackPoints[i].lat, trackPoints[i].lon);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    waypoints.push({
      name,
      lat,
      lon,
      ele,
      distance: trackPoints[closestIdx].distance,
    });
  });

  // Sort waypoints by distance
  waypoints.sort((a, b) => a.distance - b.distance);

  // Calculate bounds
  let south = Infinity,
    west = Infinity,
    north = -Infinity,
    east = -Infinity;
  for (const p of trackPoints) {
    if (p.lat < south) south = p.lat;
    if (p.lat > north) north = p.lat;
    if (p.lon < west) west = p.lon;
    if (p.lon > east) east = p.lon;
  }

  const stats: RouteStats = {
    totalDistance: cumulativeDistance,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    highestPoint: Math.round(highestPoint),
    lowestPoint: Math.round(lowestPoint),
    waypointCount: waypoints.length,
  };

  const segments = analyzeSegments(trackPoints, cumulativeDistance);
  const waypointSegments = buildWaypointSegments(trackPoints, waypoints);

  return {
    trackPoints,
    stats,
    segments,
    waypointSegments,
    waypoints,
    bounds: [
      [south, west],
      [north, east],
    ],
    center: [(south + north) / 2, (west + east) / 2],
  };
}
