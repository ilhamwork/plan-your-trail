import { NextResponse } from 'next/server'
import { resolveTier, requireTier } from '@/lib/access-guard'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { GPXData, RouteStats } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RouteRow {
  id: string
  file_name: string
  race_name: string | null
  race_date: string | null
  route_data: GPXData
}

interface RouteSummary {
  id: string
  fileName: string
  raceName: string | null
  raceDate: string | null
  stats: RouteStats
}

interface ComparisonStats {
  distanceDeltaMeters: number        // route2 - route1
  elevationGainDeltaMeters: number   // route2 - route1
  elevationLossDeltaMeters: number   // route2 - route1
  highestPointDeltaMeters: number    // route2 - route1
  waypointCountDelta: number         // route2 - route1
}

// ---------------------------------------------------------------------------
// POST /api/compare
// Compares two saved routes and returns their stats side-by-side.
// Pro-gated — Requirements: 3.8, 3.11
//
// Body:
//   routeId1 (required) — UUID of the first route (must be owned by the caller)
//   routeId2 (required) — UUID of the second route
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Resolve tier — always first, never trust client-supplied values (Req 2.7)
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // 2. Enforce Pro tier — return 403 without executing any operation (Req 3.8, 3.11)
  try {
    requireTier(ctx, 'pro')
  } catch (res) {
    return res as Response
  }

  // 3. Parse and validate body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  const { routeId1, routeId2 } = body as { routeId1?: string; routeId2?: string }

  if (typeof routeId1 !== 'string' || !routeId1.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'routeId1 is required' } },
      { status: 400 },
    )
  }
  if (typeof routeId2 !== 'string' || !routeId2.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'routeId2 is required' } },
      { status: 400 },
    )
  }
  if (routeId1.trim() === routeId2.trim()) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'routeId1 and routeId2 must be different routes' } },
      { status: 400 },
    )
  }

  const supabase = await createSupabaseServerClient()
  const userId = ctx.userId!

  // 4. Fetch route1 — must be owned by the caller
  const { data: route1, error: err1 } = await supabase
    .from('saved_routes')
    .select('id, file_name, race_name, race_date, route_data')
    .eq('id', routeId1.trim())
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single()

  if (err1 || !route1) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Route 1 not found or not owned by you' } },
      { status: 404 },
    )
  }

  // 5. Fetch route2 — must also be owned by the caller
  const { data: route2, error: err2 } = await supabase
    .from('saved_routes')
    .select('id, file_name, race_name, race_date, route_data')
    .eq('id', routeId2.trim())
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single()

  if (err2 || !route2) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Route 2 not found or not owned by you' } },
      { status: 404 },
    )
  }

  // 6. Build summaries
  function buildSummary(row: RouteRow): RouteSummary {
    return {
      id: row.id,
      fileName: row.file_name,
      raceName: row.race_name ?? null,
      raceDate: row.race_date ?? null,
      stats: row.route_data?.stats ?? {
        totalDistance: 0,
        elevationGain: 0,
        elevationLoss: 0,
        highestPoint: 0,
        lowestPoint: 0,
        waypointCount: 0,
      },
    }
  }

  const summary1 = buildSummary(route1 as RouteRow)
  const summary2 = buildSummary(route2 as RouteRow)

  // 7. Compute delta stats (route2 relative to route1)
  const delta: ComparisonStats = {
    distanceDeltaMeters: summary2.stats.totalDistance - summary1.stats.totalDistance,
    elevationGainDeltaMeters: summary2.stats.elevationGain - summary1.stats.elevationGain,
    elevationLossDeltaMeters: summary2.stats.elevationLoss - summary1.stats.elevationLoss,
    highestPointDeltaMeters: summary2.stats.highestPoint - summary1.stats.highestPoint,
    waypointCountDelta: summary2.stats.waypointCount - summary1.stats.waypointCount,
  }

  return NextResponse.json({ route1: summary1, route2: summary2, delta }, { status: 200 })
}
