import { NextResponse } from 'next/server'
import { resolveTier, requireTier } from '@/lib/access-guard'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NoteContent {
  nutrition: string
  gear: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verifies that a saved_routes row exists, is active (not soft-deleted),
 * and is owned by the given user. Returns a 404 Response if not.
 */
async function verifyRouteOwnership(routeId: string, userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('saved_routes')
    .select('id')
    .eq('id', routeId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    throw new Response(
      JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Route not found or not owned by you' } }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

// ---------------------------------------------------------------------------
// GET /api/notes/[routeId]
// Returns the nutrition and gear notes for a route.
// Pro-gated — Requirements: 3.9, 3.11
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ routeId: string }> },
) {
  const { routeId } = await params

  if (!routeId || typeof routeId !== 'string' || !routeId.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'routeId is required' } },
      { status: 400 },
    )
  }

  // 1. Resolve tier — always first, never trust client-supplied values (Req 2.7)
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // 2. Enforce Pro tier — return 403 without reading any data (Req 3.9, 3.11)
  try {
    requireTier(ctx, 'pro')
  } catch (res) {
    return res as Response
  }

  // 3. Verify route ownership
  try {
    await verifyRouteOwnership(routeId.trim(), ctx.userId!)
  } catch (res) {
    return res as Response
  }

  // 4. Fetch notes
  const supabase = await createSupabaseServerClient()
  const { data: notes, error } = await supabase
    .from('route_notes')
    .select('id, content, updated_at')
    .eq('route_id', routeId.trim())
    .eq('user_id', ctx.userId!)
    .single()

  if (error || !notes) {
    // No notes yet — return empty content rather than 404
    return NextResponse.json(
      { notes: { nutrition: '', gear: '' }, updatedAt: null },
      { status: 200 },
    )
  }

  const content = (notes.content ?? {}) as Partial<NoteContent>

  return NextResponse.json(
    {
      notes: {
        nutrition: typeof content.nutrition === 'string' ? content.nutrition : '',
        gear: typeof content.gear === 'string' ? content.gear : '',
      },
      updatedAt: notes.updated_at,
    },
    { status: 200 },
  )
}

// ---------------------------------------------------------------------------
// POST /api/notes/[routeId]
// Creates or updates (upserts) nutrition and gear notes for a route.
// Pro-gated — Requirements: 3.9, 3.11
//
// Body:
//   nutrition (required) — string
//   gear      (required) — string
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ routeId: string }> },
) {
  const { routeId } = await params

  if (!routeId || typeof routeId !== 'string' || !routeId.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'routeId is required' } },
      { status: 400 },
    )
  }

  // 1. Resolve tier — always first, never trust client-supplied values (Req 2.7)
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // 2. Enforce Pro tier — return 403 without executing any write (Req 3.9, 3.11)
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

  const { nutrition, gear } = body as { nutrition?: unknown; gear?: unknown }

  if (typeof nutrition !== 'string') {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'nutrition must be a string' } },
      { status: 400 },
    )
  }
  if (typeof gear !== 'string') {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'gear must be a string' } },
      { status: 400 },
    )
  }

  // 4. Verify route ownership before any write
  try {
    await verifyRouteOwnership(routeId.trim(), ctx.userId!)
  } catch (res) {
    return res as Response
  }

  // 5. Upsert notes (insert or update based on route_id + user_id uniqueness)
  const supabase = await createSupabaseServerClient()
  const now = new Date().toISOString()

  const { data: upserted, error } = await supabase
    .from('route_notes')
    .upsert(
      {
        route_id: routeId.trim(),
        user_id: ctx.userId!,
        content: { nutrition, gear } satisfies NoteContent,
        updated_at: now,
      },
      { onConflict: 'route_id,user_id' },
    )
    .select('id, content, updated_at')
    .single()

  if (error || !upserted) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to save notes' } },
      { status: 500 },
    )
  }

  const savedContent = (upserted.content ?? {}) as Partial<NoteContent>

  return NextResponse.json(
    {
      notes: {
        nutrition: typeof savedContent.nutrition === 'string' ? savedContent.nutrition : '',
        gear: typeof savedContent.gear === 'string' ? savedContent.gear : '',
      },
      updatedAt: upserted.updated_at,
    },
    { status: 200 },
  )
}
