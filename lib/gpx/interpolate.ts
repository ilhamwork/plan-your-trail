import type { TrackPoint } from "../types"

/**
 * Interpolates geographical coordinates and elevation for a given cumulative distance.
 * Clamps to track boundaries if target distance is outside the track.
 */
export function interpolateCoordinatesForDistance(
  pts: TrackPoint[],
  targetDistMeters: number
): { lat: number; lon: number; ele: number } {
  if (pts.length === 0) return { lat: 0, lon: 0, ele: 0 }
  if (pts.length === 1 || targetDistMeters <= pts[0].distance) {
    return { lat: pts[0].lat, lon: pts[0].lon, ele: pts[0].ele }
  }
  const last = pts[pts.length - 1]
  if (targetDistMeters >= last.distance) {
    return { lat: last.lat, lon: last.lon, ele: last.ele }
  }

  let idx = pts.findIndex((p) => p.distance >= targetDistMeters)
  if (idx < 0) idx = pts.length - 1
  if (idx === 0) idx = 1

  const p0 = pts[idx - 1]
  const p1 = pts[idx]
  const span = p1.distance - p0.distance
  const t = span > 0 ? Math.max(0, Math.min(1, (targetDistMeters - p0.distance) / span)) : 0

  return {
    lat: p0.lat + t * (p1.lat - p0.lat),
    lon: p0.lon + t * (p1.lon - p0.lon),
    ele: p0.ele + t * (p1.ele - p0.ele),
  }
}
