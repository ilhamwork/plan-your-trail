import { NextResponse } from 'next/server'
import { resolveTier, requireTier } from '@/lib/access-guard'
import type { GPXData } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaceParams {
  targetTimeMinutes?: number  // overall target finish time in minutes
  paceMinPerKm?: number       // flat-equivalent pace in min/km
}

interface SegmentPaceEstimate {
  segmentId: number
  name: string
  distanceKm: number
  estimatedTimeMinutes: number
  adjustedPaceMinPerKm: number
}

interface WaypointCutoff {
  waypointId: string | undefined
  name: string
  distanceKm: number
  cumulativeTimeMinutes: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses and validates the request body; throws a 400 Response on failure.
 */
async function parseBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json()
  } catch {
    throw new Response(
      JSON.stringify({ error: { code: 'INVALID_BODY', message: 'Invalid JSON body' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

/**
 * Grade-adjusted pace multiplier using a simplified Minetti-inspired model.
 * gradient is in percent (e.g. 10 = 10% grade).
 */
function gradeMultiplier(gradient: number): number {
  // Empirically derived coefficients for trail running
  // flat = 1.0; climb ~1.5x slower per 10%; descent moderately slower
  if (gradient >= 0) {
    return 1 + gradient * 0.05  // 5% slower per 1% of positive grade
  }
  // Descent: slightly slower past -15%, faster between 0% and -15%
  if (gradient >= -15) {
    return 1 - Math.abs(gradient) * 0.015
  }
  return 1 + (Math.abs(gradient) - 15) * 0.01
}

// ---------------------------------------------------------------------------
// POST /api/pace
// Estimates per-segment pace and waypoint cutoff times for a route.
// Pro-gated — Requirements: 3.5, 3.11
//
// Body:
//   routeData  (required) — GPXData object
//   paceParams (optional) — { targetTimeMinutes?, paceMinPerKm? }
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Resolve tier — always first, never trust client-supplied values (Req 2.7)
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // 2. Enforce Pro tier — return 403 without executing any computation (Req 3.5, 3.11)
  try {
    requireTier(ctx, 'pro')
  } catch (res) {
    return res as Response
  }

  // 3. Parse and validate body
  let body: Record<string, unknown>
  try {
    body = await parseBody(request)
  } catch (res) {
    return res as Response
  }

  const { routeData, paceParams } = body as {
    routeData?: GPXData
    paceParams?: PaceParams
  }

  if (!routeData || typeof routeData !== 'object') {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'routeData is required' } },
      { status: 400 },
    )
  }

  if (!Array.isArray(routeData.waypointSegments)) {
    return NextResponse.json(
      { error: { code: 'INVALID_DATA', message: 'routeData must include waypointSegments' } },
      { status: 400 },
    )
  }

  // 4. Derive base pace in min/km
  const totalDistanceKm = (routeData.stats?.totalDistance ?? 0) / 1000
  let basePaceMinPerKm: number

  if (paceParams?.paceMinPerKm && paceParams.paceMinPerKm > 0) {
    basePaceMinPerKm = paceParams.paceMinPerKm
  } else if (paceParams?.targetTimeMinutes && paceParams.targetTimeMinutes > 0 && totalDistanceKm > 0) {
    basePaceMinPerKm = paceParams.targetTimeMinutes / totalDistanceKm
  } else {
    // Default: 6 min/km flat-equivalent pace
    basePaceMinPerKm = 6
  }

  // 5. Compute per-segment estimates using grade-adjusted pace
  let cumulativeTimeMinutes = 0
  const segmentEstimates: SegmentPaceEstimate[] = routeData.waypointSegments.map((seg) => {
    const distanceKm = seg.distance / 1000
    const avgGradient =
      distanceKm > 0 ? (seg.elevationGain - seg.elevationLoss) / (seg.distance) * 100 : 0
    const multiplier = gradeMultiplier(avgGradient)
    const adjustedPace = basePaceMinPerKm * multiplier
    const segTime = adjustedPace * distanceKm
    cumulativeTimeMinutes += segTime

    return {
      segmentId: seg.id,
      name: seg.name,
      distanceKm: parseFloat(distanceKm.toFixed(3)),
      estimatedTimeMinutes: parseFloat(segTime.toFixed(1)),
      adjustedPaceMinPerKm: parseFloat(adjustedPace.toFixed(2)),
    }
  })

  // 6. Compute cumulative cutoff times at each waypoint
  let cumulative = 0
  const waypointCutoffs: WaypointCutoff[] = routeData.waypointSegments.map((seg, i) => {
    const distanceKm = seg.distance / 1000
    const avgGradient =
      distanceKm > 0 ? (seg.elevationGain - seg.elevationLoss) / (seg.distance) * 100 : 0
    const multiplier = gradeMultiplier(avgGradient)
    const segTime = basePaceMinPerKm * multiplier * distanceKm
    cumulative += segTime

    const waypoint = routeData.waypoints?.[i]
    return {
      waypointId: waypoint?.id,
      name: seg.name,
      distanceKm: parseFloat(((routeData.stats?.totalDistance ?? 0) / 1000 * (i + 1) / routeData.waypointSegments.length).toFixed(3)),
      cumulativeTimeMinutes: parseFloat(cumulative.toFixed(1)),
    }
  })

  return NextResponse.json(
    {
      basePaceMinPerKm: parseFloat(basePaceMinPerKm.toFixed(2)),
      totalEstimatedTimeMinutes: parseFloat(segmentEstimates.reduce((s, e) => s + e.estimatedTimeMinutes, 0).toFixed(1)),
      segmentEstimates,
      waypointCutoffs,
    },
    { status: 200 },
  )
}
