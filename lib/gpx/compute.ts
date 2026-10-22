import type {
  TrackPoint,
  Waypoint,
  RouteStats,
  GPXData,
} from "../types";
import { analyzeSegments, buildWaypointSegments } from "../segment-analysis";
import type { ExtractedGPX } from "./types";
import { ERR_MIN_POINTS } from "./types";

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

// ─── Compute GPX data from extracted points (DOM-free) ──────────────
export function computeGPXData(extracted: ExtractedGPX): GPXData {
  const rawPoints: { lat: number; lon: number; ele: number }[] = [];

  for (const line of extracted.lines) {
    for (const p of line) {
      rawPoints.push(p);
    }
  }

  if (rawPoints.length < 2) {
    throw new Error(ERR_MIN_POINTS);
  }

  // Smooth elevation data
  const smoothedEle = smoothElevation(rawPoints.map((p) => p.ele), 10);

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
  // Use a minimum threshold to filter out GPS noise / micro-jitter.
  // Changes smaller than this value are ignored when accumulating gain/loss.
  const ELEVATION_NOISE_THRESHOLD = 5; // meters

  let elevationGain = 0;
  let elevationLoss = 0;
  let highestPoint = -Infinity;
  let lowestPoint = Infinity;
  let pendingEle = trackPoints[0]?.ele ?? 0; // track "last confirmed" elevation

  for (let i = 0; i < trackPoints.length; i++) {
    if (trackPoints[i].ele > highestPoint) highestPoint = trackPoints[i].ele;
    if (trackPoints[i].ele < lowestPoint) lowestPoint = trackPoints[i].ele;

    if (i > 0) {
      const diff = trackPoints[i].ele - pendingEle;
      if (Math.abs(diff) >= ELEVATION_NOISE_THRESHOLD) {
        if (diff > 0) elevationGain += diff;
        else elevationLoss += Math.abs(diff);
        pendingEle = trackPoints[i].ele;
      }
    }
  }

  // Extract named waypoints from GPX
  const rawWaypoints = extracted.waypoints;

  // Deduplicate raw waypoints (same name and very close physical location)
  const uniqueRawWaypoints: typeof rawWaypoints = [];
  for (const rw of rawWaypoints) {
    const isDuplicate = uniqueRawWaypoints.some(
      (urw) => urw.name === rw.name && haversineDistance(urw.lat, urw.lon, rw.lat, rw.lon) < 50
    );
    if (!isDuplicate) {
      uniqueRawWaypoints.push(rw);
    }
  }

  const waypoints: Waypoint[] = [];
  const THRESHOLD_ENTER = 500;  // meters
  const THRESHOLD_EXIT = 500;   // meters
  const MIN_TRACK_DIST_BETWEEN_PASSES = 1000; // meters

  for (const wpt of uniqueRawWaypoints) {
    let inPass = false;
    let currentPassMinDist = Infinity;
    let currentPassIdx = -1;
    const passIndices: number[] = [];

    for (let i = 0; i < trackPoints.length; i++) {
      const d = haversineDistance(wpt.lat, wpt.lon, trackPoints[i].lat, trackPoints[i].lon);

      if (!inPass && d < THRESHOLD_ENTER) {
        inPass = true;
        currentPassMinDist = d;
        currentPassIdx = i;
      } else if (inPass) {
        if (d < currentPassMinDist) {
          currentPassMinDist = d;
          currentPassIdx = i;
        }
        if (d > THRESHOLD_EXIT) {
          passIndices.push(currentPassIdx);
          inPass = false;
        }
      }
    }

    if (inPass) {
      passIndices.push(currentPassIdx);
    }

    if (passIndices.length === 0) {
      continue;
    }

    // Filter passes that are too close along the track to prevent GPS drift duplicates
    const filteredPassIndices: number[] = [];
    for (const idx of passIndices) {
      if (filteredPassIndices.length === 0) {
        filteredPassIndices.push(idx);
      } else {
        const lastIdx = filteredPassIndices[filteredPassIndices.length - 1];
        const distDiff = Math.abs(trackPoints[idx].distance - trackPoints[lastIdx].distance);
        if (distDiff > MIN_TRACK_DIST_BETWEEN_PASSES) {
          filteredPassIndices.push(idx);
        } else {
          // If they are close on the track, keep the one that is physically closer to the waypoint
          const d1 = haversineDistance(wpt.lat, wpt.lon, trackPoints[idx].lat, trackPoints[idx].lon);
          const d2 = haversineDistance(wpt.lat, wpt.lon, trackPoints[lastIdx].lat, trackPoints[lastIdx].lon);
          if (d1 < d2) {
            filteredPassIndices[filteredPassIndices.length - 1] = idx;
          }
        }
      }
    }

    // Add a waypoint for each valid pass
    for (const idx of filteredPassIndices) {
      waypoints.push({
        name: wpt.name,
        lat: wpt.lat,
        lon: wpt.lon,
        ele: wpt.ele,
        distance: trackPoints[idx].distance,
      });
    }
  }

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
