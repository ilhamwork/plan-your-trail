import { NextResponse } from 'next/server'
import { resolveTier, requireTier } from '@/lib/access-guard'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Waypoint } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a simple unique ID for new waypoints.
 * Uses crypto.randomUUID() when available (Node 19+) or a fallback.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Parses the request body and returns it, or throws a 400 Response on failure.
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
 * Fetches a saved route by ID, verifying it exists and is owned by the user.
 * Returns the route or throws an appropriate Response.
 */
async function fetchOwnedRoute(routeId: string, userId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: route, error } = await supabase
    .from('saved_routes')
    .select('id, route_data, access_level')
    .eq('id', routeId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single()

  if (error || !route) {
    throw new Response(
      JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (route.access_level === 'read_only') {
    throw new Response(
      JSON.stringify({
        error: {
          code: 'ROUTE_READ_ONLY',
          message: 'This route is read-only. Upgrade to Pro to modify it.',
        },
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return route
}

/**
 * Persists the updated waypoints array back into route_data JSONB.
 */
async function saveWaypoints(routeId: string, routeData: Record<string, unknown>, waypoints: Waypoint[]) {
  const supabase = await createSupabaseServerClient()

  const updatedRouteData = { ...routeData, waypoints }

  const { data: updated, error } = await supabase
    .from('saved_routes')
    .update({
      route_data: updatedRouteData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', routeId)
    .select('id, route_data')
    .single()

  if (error || !updated) {
    throw new Response(
      JSON.stringify({ error: { code: 'DATABASE_ERROR', message: 'Failed to save waypoints' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return updated
}

// ---------------------------------------------------------------------------
// POST /api/waypoints
// Add a waypoint to a route.
// Requirements: 3.1, 3.11
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Resolve tier — always first, never trust client-supplied values
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // 2. Enforce Pro tier — 403 without executing the operation (Req 3.11)
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

  const { routeId, name, lat, lng, elevation, notes } = body as {
    routeId?: string
    name?: string
    lat?: number
    lng?: number
    elevation?: number
    notes?: string
  }

  if (typeof routeId !== 'string' || !routeId.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'routeId is required' } },
      { status: 400 },
    )
  }
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'name is required' } },
      { status: 400 },
    )
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'lat and lng are required numbers' } },
      { status: 400 },
    )
  }

  // 4. Fetch and verify route ownership
  let route: Awaited<ReturnType<typeof fetchOwnedRoute>>
  try {
    route = await fetchOwnedRoute(routeId, ctx.userId!)
  } catch (res) {
    return res as Response
  }

  // 5. Build and append the new waypoint
  const routeData = (route.route_data ?? {}) as Record<string, unknown>
  const existingWaypoints: Waypoint[] = Array.isArray(routeData.waypoints)
    ? (routeData.waypoints as Waypoint[])
    : []

  const newWaypoint: Waypoint = {
    id: generateId(),
    name: name.trim(),
    lat,
    lon: lng,
    ele: typeof elevation === 'number' ? elevation : 0,
    distance: 0, // distance along track is computed client-side from lat/lng interpolation
    isFromGpx: false,
    // notes is not in the Waypoint type but stored as extra field if provided
    ...(typeof notes === 'string' && notes.trim() ? { notes: notes.trim() } : {}),
  }

  const updatedWaypoints = [...existingWaypoints, newWaypoint]

  // 6. Persist
  let updated
  try {
    updated = await saveWaypoints(routeId, routeData, updatedWaypoints)
  } catch (res) {
    return res as Response
  }

  return NextResponse.json({ waypoint: newWaypoint, route_data: updated.route_data }, { status: 201 })
}

// ---------------------------------------------------------------------------
// PUT /api/waypoints
// Update an existing waypoint on a route.
// Requirements: 3.1, 3.11
// ---------------------------------------------------------------------------

export async function PUT(request: Request) {
  // 1. Resolve tier — always first
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // 2. Enforce Pro tier — 403 without executing the operation (Req 3.11)
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

  const { id, routeId, name, lat, lng, elevation, notes } = body as {
    id?: string
    routeId?: string
    name?: string
    lat?: number
    lng?: number
    elevation?: number
    notes?: string
  }

  if (typeof id !== 'string' || !id.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'id (waypoint id) is required' } },
      { status: 400 },
    )
  }
  if (typeof routeId !== 'string' || !routeId.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'routeId is required' } },
      { status: 400 },
    )
  }

  // 4. Fetch and verify route ownership
  let route: Awaited<ReturnType<typeof fetchOwnedRoute>>
  try {
    route = await fetchOwnedRoute(routeId, ctx.userId!)
  } catch (res) {
    return res as Response
  }

  // 5. Find and update the waypoint
  const routeData = (route.route_data ?? {}) as Record<string, unknown>
  const existingWaypoints: Waypoint[] = Array.isArray(routeData.waypoints)
    ? (routeData.waypoints as Waypoint[])
    : []

  const waypointIndex = existingWaypoints.findIndex((wp) => wp.id === id.trim())
  if (waypointIndex === -1) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Waypoint not found on this route' } },
      { status: 404 },
    )
  }

  const existing = existingWaypoints[waypointIndex]
  const updatedWaypoint: Waypoint = {
    ...existing,
    ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
    ...(typeof lat === 'number' ? { lat } : {}),
    ...(typeof lng === 'number' ? { lon: lng } : {}),
    ...(typeof elevation === 'number' ? { ele: elevation } : {}),
    ...(typeof notes === 'string' ? { notes: notes.trim() } : {}),
  }

  const updatedWaypoints = [
    ...existingWaypoints.slice(0, waypointIndex),
    updatedWaypoint,
    ...existingWaypoints.slice(waypointIndex + 1),
  ]

  // 6. Persist
  let updated
  try {
    updated = await saveWaypoints(routeId, routeData, updatedWaypoints)
  } catch (res) {
    return res as Response
  }

  return NextResponse.json({ waypoint: updatedWaypoint, route_data: updated.route_data })
}

// ---------------------------------------------------------------------------
// DELETE /api/waypoints
// Remove a waypoint from a route.
// Requirements: 3.1, 3.11
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  // 1. Resolve tier — always first
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // 2. Enforce Pro tier — 403 without executing the operation (Req 3.11)
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

  const { id, routeId } = body as { id?: string; routeId?: string }

  if (typeof id !== 'string' || !id.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'id (waypoint id) is required' } },
      { status: 400 },
    )
  }
  if (typeof routeId !== 'string' || !routeId.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'routeId is required' } },
      { status: 400 },
    )
  }

  // 4. Fetch and verify route ownership
  let route: Awaited<ReturnType<typeof fetchOwnedRoute>>
  try {
    route = await fetchOwnedRoute(routeId, ctx.userId!)
  } catch (res) {
    return res as Response
  }

  // 5. Find and remove the waypoint
  const routeData = (route.route_data ?? {}) as Record<string, unknown>
  const existingWaypoints: Waypoint[] = Array.isArray(routeData.waypoints)
    ? (routeData.waypoints as Waypoint[])
    : []

  const waypointIndex = existingWaypoints.findIndex((wp) => wp.id === id.trim())
  if (waypointIndex === -1) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Waypoint not found on this route' } },
      { status: 404 },
    )
  }

  const updatedWaypoints = existingWaypoints.filter((wp) => wp.id !== id.trim())

  // 6. Persist
  try {
    await saveWaypoints(routeId, routeData, updatedWaypoints)
  } catch (res) {
    return res as Response
  }

  return NextResponse.json({ success: true })
}
