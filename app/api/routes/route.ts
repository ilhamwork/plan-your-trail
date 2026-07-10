import { NextResponse } from 'next/server'
import { resolveTier } from '@/lib/access-guard'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREE_FILE_SIZE_LIMIT = 10_485_760  // 10 MB
const PRO_FILE_SIZE_LIMIT  = 26_214_400  // 25 MB
const FREE_ROUTE_LIMIT     = 3

// ---------------------------------------------------------------------------
// Request body shape for POST
// ---------------------------------------------------------------------------

interface CreateRouteBody {
  file_name: string
  race_name?: string
  race_date?: string
  route_data: object
  gpx_storage_path?: string
  file_size_bytes: number
}

// ---------------------------------------------------------------------------
// GET /api/routes
// Requirements: 5.1, 5.2
// ---------------------------------------------------------------------------

export async function GET() {
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // Require at least free tier (authenticated)
  if (ctx.tier === 'anonymous') {
    return NextResponse.json(
      { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Please sign in to view your routes' } },
      { status: 401 },
    )
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('saved_routes')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to fetch routes' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ routes: data ?? [] })
}

// ---------------------------------------------------------------------------
// POST /api/routes
// Requirements: 3.10, 5.1, 5.2, 5.5, 13.1, 13.2, 13.3
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Always resolve tier first — never trust client-supplied tier values
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // 2. Require at least free (anonymous cannot save routes)
  if (ctx.tier === 'anonymous') {
    return NextResponse.json(
      {
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Please sign in to save routes',
        },
      },
      { status: 401 },
    )
  }

  // 3. Parse body
  let body: Partial<CreateRouteBody>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  // 4. Validate required fields
  if (typeof body.file_name !== 'string' || !body.file_name.trim()) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'file_name is required' } },
      { status: 400 },
    )
  }
  if (typeof body.file_size_bytes !== 'number' || body.file_size_bytes < 0) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'file_size_bytes must be a non-negative number' } },
      { status: 400 },
    )
  }
  if (!body.route_data || typeof body.route_data !== 'object') {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'route_data is required' } },
      { status: 400 },
    )
  }

  // 5. Enforce file size limits (Req 13.1, 13.2, 13.3)
  const sizeLimit = ctx.tier === 'pro' ? PRO_FILE_SIZE_LIMIT : FREE_FILE_SIZE_LIMIT

  if (body.file_size_bytes > sizeLimit) {
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

  const supabase = await createSupabaseServerClient()

  // 6. Enforce Free 3-route limit (Req 3.10, 5.1)
  if (ctx.tier === 'free') {
    const { count, error: countError } = await supabase
      .from('saved_routes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId!)
      .is('deleted_at', null)

    if (countError) {
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to check route count' } },
        { status: 500 },
      )
    }

    if ((count ?? 0) >= FREE_ROUTE_LIMIT) {
      return NextResponse.json(
        {
          error: {
            code: 'ROUTE_LIMIT_REACHED',
            message:
              'Free plan limit of 3 routes reached. Upgrade to Pro for unlimited routes.',
          },
        },
        { status: 403 },
      )
    }
  }

  // 7. Insert the route
  const { data: newRoute, error: insertError } = await supabase
    .from('saved_routes')
    .insert({
      user_id: ctx.userId!,
      file_name: body.file_name.trim(),
      race_name: body.race_name ?? null,
      race_date: body.race_date ?? null,
      route_data: body.route_data,
      gpx_storage_path: body.gpx_storage_path ?? null,
      file_size_bytes: body.file_size_bytes,
      access_level: 'read_write',
    })
    .select()
    .single()

  if (insertError || !newRoute) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: 'Failed to save route' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ route: newRoute }, { status: 201 })
}
