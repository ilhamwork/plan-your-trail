import type { TrackPoint } from "../types"

/**
 * Calculates perpendicular distance (in approximate degrees) from point P to line segment AB.
 */
function perpendicularDistance(
  p: TrackPoint,
  a: TrackPoint,
  b: TrackPoint
): number {
  const midLatRad = ((a.lat + b.lat) / 2) * (Math.PI / 180)
  const cosLat = Math.cos(midLatRad)

  const dx = (b.lon - a.lon) * cosLat
  const dy = b.lat - a.lat

  if (dx === 0 && dy === 0) {
    const px = (p.lon - a.lon) * cosLat
    const py = p.lat - a.lat
    return Math.sqrt(px * px + py * py)
  }

  const px = (p.lon - a.lon) * cosLat
  const py = p.lat - a.lat

  const numerator = Math.abs(px * dy - py * dx)
  const denominator = Math.sqrt(dx * dx + dy * dy)

  return numerator / denominator
}

/**
 * Standard Douglas-Peucker recursive simplification.
 */
function douglasPeucker(
  points: TrackPoint[],
  epsilon: number
): TrackPoint[] {
  if (points.length <= 2) {
    return points
  }

  let dmax = 0
  let index = 0
  const end = points.length - 1

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end])
    if (d > dmax) {
      index = i
      dmax = d
    }
  }

  if (dmax > epsilon) {
    const recResults1 = douglasPeucker(points.slice(0, index + 1), epsilon)
    const recResults2 = douglasPeucker(points.slice(index), epsilon)

    // Concatenate, avoiding duplicate of points[index]
    return recResults1.slice(0, recResults1.length - 1).concat(recResults2)
  }

  return [points[0], points[end]]
}

/**
 * Simplifies a track down to a compact representation for fast database queries and rendering.
 * Target is ~300 to 800 points.
 *
 * @param points Array of TrackPoints
 * @param targetMaxPoints Maximum desired point count (default 800)
 */
export function simplifyTrack(
  points: TrackPoint[],
  targetMaxPoints = 800
): TrackPoint[] {
  if (!points || points.length <= targetMaxPoints) {
    return points ?? []
  }

  // Initial epsilon ~0.0001 degrees (~10-11 meters)
  let epsilon = 0.0001
  let result = douglasPeucker(points, epsilon)

  // If still exceeds target, increase epsilon dynamically
  let attempts = 0
  while (result.length > targetMaxPoints && attempts < 8) {
    epsilon *= 1.8
    result = douglasPeucker(points, epsilon)
    attempts++
  }

  return result
}
