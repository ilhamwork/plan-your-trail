import { NextResponse } from 'next/server'
import { resolveTier, requireTier } from '@/lib/access-guard'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'
import { generateShareToken } from '@/lib/share-token'

// Maximum number of active share links per route (Req 11.3)
const SHARE_LINK_LIMIT = 5

// ---------------------------------------------------------------------------
// POST /api/share
// Requirements: 3.7, 3.11, 11.1, 11.2, 11.3
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // Resolve tier and enforce Pro gate (Req 3.7, 3.11, 11.1)
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  try {
    requireTier(ctx, 'pro')
  } catch (res) {
    return res as Response
  }

  // Parse request body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  const routeId = body.route_id
  if (!routeId || typeof routeId !== 'string') {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: '`route_id` is required' } },
      { status: 400 },
    )
  }

  const supabase = await createSupabaseServerClient()

  // Verify the authenticated user owns this route and it is not soft-deleted (Req 11.1)
  const { data: route, error: routeError } = await supabase
    .from('saved_routes')
    .select('id, user_id')
    .eq('id', routeId)
    .is('deleted_at', null)
    .single()

  if (routeError || !route) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Route not found' } },
      { status: 404 },
    )
  }

  // RLS ensures ownership, but double-check explicitly for clarity
  if (route.user_id !== ctx.userId) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'You do not own this route' } },
      { status: 403 },
    )
  }

  // Enforce 5-active-link limit per route (Req 11.3)
  const admin = createSupabaseAdminClient()

  const { count, error: countError } = await admin
    .from('share_links')
    .select('*', { count: 'exact', head: true })
    .eq('route_id', routeId)
    .eq('is_active', true)

  if (countError) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to check share link count' } },
      { status: 500 },
    )
  }

  if ((count ?? 0) >= SHARE_LINK_LIMIT) {
    return NextResponse.json(
      {
        error: {
          code: 'SHARE_LIMIT_REACHED',
          message: `You can have at most ${SHARE_LINK_LIMIT} active share links per route. Revoke an existing link to create a new one.`,
          limit: SHARE_LINK_LIMIT,
        },
      },
      { status: 403 },
    )
  }

  // Generate a cryptographically secure token (Req 11.2)
  const token = generateShareToken()

  // Insert the share link using the admin client (bypasses RLS for insert)
  const { data: shareLink, error: insertError } = await admin
    .from('share_links')
    .insert({
      route_id: routeId,
      user_id: ctx.userId,
      token,
      is_active: true,
    })
    .select()
    .single()

  if (insertError || !shareLink) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to create share link' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ shareLink }, { status: 201 })
}
