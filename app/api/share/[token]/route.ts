import { NextResponse } from 'next/server'
import { resolveTier, requireTier } from '@/lib/access-guard'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Route params
// ---------------------------------------------------------------------------

interface TokenParams {
  params: Promise<{ token: string }>
}

// ---------------------------------------------------------------------------
// GET /api/share/[token]
// No authentication required — public endpoint.
// Requirements: 11.3, 11.5, 11.6
// ---------------------------------------------------------------------------

export async function GET(_request: Request, { params }: TokenParams) {
  const { token } = await params

  if (!token || typeof token !== 'string') {
    return NextResponse.json(
      { error: { code: 'INVALID_TOKEN', message: 'Invalid share token' } },
      { status: 400 },
    )
  }

  // Use the admin/service-role client to bypass RLS for public token lookup.
  // RLS on share_links restricts access to the owner; the admin client lets
  // unauthenticated recipients read active tokens (Req 11.3).
  const admin = createSupabaseAdminClient()

  // Fetch the share link by token, only if it is still active (Req 11.5)
  const { data: shareLink, error: linkError } = await admin
    .from('share_links')
    .select('id, route_id, user_id, token, is_active, created_at')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (linkError || !shareLink) {
    // Missing or revoked token → 404 (Req 11.5)
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Share link not found or has been revoked' } },
      { status: 404 },
    )
  }

  // Verify the associated route exists and is not soft-deleted (Req 11.6)
  const { data: route, error: routeError } = await admin
    .from('saved_routes')
    .select('*')
    .eq('id', shareLink.route_id)
    .is('deleted_at', null)
    .single()

  if (routeError || !route) {
    // Soft-deleted or missing route → 404 (Req 11.6)
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'The shared route is no longer available' } },
      { status: 404 },
    )
  }

  return NextResponse.json({ route, shareLink: { id: shareLink.id, created_at: shareLink.created_at } })
}

// ---------------------------------------------------------------------------
// DELETE /api/share/[token]
// Requires any authenticated user (Free+). Only the link owner may revoke.
// Requirements: 11.4, 11.5, 10.3, 10.4
// ---------------------------------------------------------------------------

export async function DELETE(_request: Request, { params }: TokenParams) {
  const { token } = await params

  if (!token || typeof token !== 'string') {
    return NextResponse.json(
      { error: { code: 'INVALID_TOKEN', message: 'Invalid share token' } },
      { status: 400 },
    )
  }

  // Resolve tier — any authenticated user (Free+) can revoke their own links
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // requireTier(ctx, 'free') blocks anonymous users, allows free and pro
  try {
    requireTier(ctx, 'free')
  } catch (res) {
    return res as Response
  }

  const admin = createSupabaseAdminClient()

  // Fetch the share link — check existence and ownership
  const { data: shareLink, error: linkError } = await admin
    .from('share_links')
    .select('id, route_id, user_id, is_active')
    .eq('token', token)
    .single()

  if (linkError || !shareLink) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Share link not found' } },
      { status: 404 },
    )
  }

  // Verify ownership — only the user who created the link may revoke it (Req 10.4)
  if (shareLink.user_id !== ctx.userId) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'You do not own this share link' } },
      { status: 403 },
    )
  }

  // Idempotent: if already revoked, return success without error
  if (!shareLink.is_active) {
    return NextResponse.json({ success: true, message: 'Share link was already revoked' })
  }

  // Revoke: set is_active=FALSE and record revocation timestamp (Req 11.5, 10.4)
  const { error: updateError } = await admin
    .from('share_links')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq('id', shareLink.id)

  if (updateError) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to revoke share link' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}
