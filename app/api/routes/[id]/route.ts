import { NextResponse } from 'next/server'
import { resolveTier } from '@/lib/access-guard'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREE_FILE_SIZE_LIMIT = 10_485_760  // 10 MB
const PRO_FILE_SIZE_LIMIT  = 26_214_400  // 25 MB

// ---------------------------------------------------------------------------
// Route params
// ---------------------------------------------------------------------------

interface RouteParams {
  params: Promise<{ id: string }>
}

// ---------------------------------------------------------------------------
// GET /api/routes/[id]
// Requirements: 5.1
// ---------------------------------------------------------------------------

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params

  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  if (ctx.tier === 'anonymous') {
    return NextResponse.json(
      { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Please sign in to access routes' } },
      { status: 401 },
    )
  }

  const supabase = await createSupabaseServerClient()

  const { data: route, error } = await supabase
    .from('saved_routes')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  // Return 404 if not found, deleted, or not owned by this user (RLS handles ownership)
  if (error || !route) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Route not found' } },
      { status: 404 },
    )
  }

  return NextResponse.json({ route })
}

// ---------------------------------------------------------------------------
// PATCH /api/routes/[id]
// Requirements: 5.5, 5.6
// ---------------------------------------------------------------------------

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params

  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  if (ctx.tier === 'anonymous') {
    return NextResponse.json(
      { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Please sign in to update routes' } },
      { status: 401 },
    )
  }

  const supabase = await createSupabaseServerClient()

  // Fetch existing route (RLS ensures ownership)
  const { data: existing, error: fetchError } = await supabase
    .from('saved_routes')
    .select('id, access_level, file_size_bytes')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Route not found' } },
      { status: 404 },
    )
  }

  // Block writes on read-only routes (Req 5.6)
  if (existing.access_level === 'read_only') {
    return NextResponse.json(
      {
        error: {
          code: 'ROUTE_READ_ONLY',
          message: 'This route is read-only. Upgrade to Pro to edit it.',
        },
      },
      { status: 403 },
    )
  }

  // Parse body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  // Build the update payload from allowed fields only
  const allowedFields = ['file_name', 'race_name', 'race_date', 'route_data', 'gpx_storage_path', 'file_size_bytes'] as const
  type AllowedField = typeof allowedFields[number]

  const updatePayload: Partial<Record<AllowedField, unknown>> & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  }

  for (const field of allowedFields) {
    if (field in body) {
      updatePayload[field] = body[field]
    }
  }

  // Re-enforce file size limit if file_size_bytes is being updated (Req 5.5)
  if ('file_size_bytes' in updatePayload && updatePayload.file_size_bytes !== undefined) {
    const newSize = updatePayload.file_size_bytes as number
    const sizeLimit = ctx.tier === 'pro' ? PRO_FILE_SIZE_LIMIT : FREE_FILE_SIZE_LIMIT

    if (typeof newSize === 'number' && newSize > sizeLimit) {
      return NextResponse.json(
        {
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File exceeds the ${ctx.tier === 'pro' ? '25' : '10'} MB limit for your plan.`,
            limit: sizeLimit,
            tier: ctx.tier,
          },
        },
        { status: 413 },
      )
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('saved_routes')
    .update(updatePayload)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single()

  if (updateError || !updated) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to update route' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ route: updated })
}

// ---------------------------------------------------------------------------
// DELETE /api/routes/[id]
// Requirements: 5.6
// ---------------------------------------------------------------------------

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params

  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  if (ctx.tier === 'anonymous') {
    return NextResponse.json(
      { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Please sign in to delete routes' } },
      { status: 401 },
    )
  }

  const supabase = await createSupabaseServerClient()

  // Verify route exists and is owned by this user (RLS handles ownership check)
  const { data: existing, error: fetchError } = await supabase
    .from('saved_routes')
    .select('id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Route not found' } },
      { status: 404 },
    )
  }

  const now = new Date().toISOString()

  // Soft-delete the route
  const { error: deleteError } = await supabase
    .from('saved_routes')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to delete route' } },
      { status: 500 },
    )
  }

  // Deactivate all share_links for this route using admin client (bypasses RLS)
  const admin = createSupabaseAdminClient()
  await admin
    .from('share_links')
    .update({ is_active: false, revoked_at: now })
    .eq('route_id', id)
    .eq('is_active', true)

  return NextResponse.json({ success: true })
}
