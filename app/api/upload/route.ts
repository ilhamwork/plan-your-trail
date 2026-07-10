import { NextResponse } from 'next/server'
import { resolveTier } from '@/lib/access-guard'
import { checkRateLimit, recordUpload } from '@/lib/rate-limiter'

// ---------------------------------------------------------------------------
// Constants (Req 13.1, 13.2)
// ---------------------------------------------------------------------------

const ANON_FREE_SIZE_LIMIT = 10_485_760  // 10 MB
const PRO_SIZE_LIMIT       = 26_214_400  // 25 MB

// ---------------------------------------------------------------------------
// POST /api/upload
// Hybrid approach: client parses GPX locally, server enforces rate limiting
// and file size validation only.
// Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8, 13.1, 13.2, 13.3
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // ─── 1. Resolve tier ──────────────────────────────────────────────
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // ─── 2. Determine rate-limit identifier ───────────────────────────
  const identifierType: 'ip' | 'user' = ctx.tier === 'anonymous' ? 'ip' : 'user'
  const identifier =
    ctx.tier === 'anonymous'
      ? (
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip')?.trim() ||
          'local-anon'
        )
      : ctx.userId!

  // ─── 3. Check rate limit BEFORE processing (Req 6.6, 6.7) ────────
  const rateLimit = await checkRateLimit(identifier, identifierType, ctx.tier)
  console.log('[upload] rate-limit check', { identifier, identifierType, tier: ctx.tier, rateLimit })

  if (!rateLimit.allowed) {
    const cta =
      ctx.tier === 'anonymous'
        ? 'Create a free account to get 50 uploads per day'
        : 'Upgrade to Pro for unlimited uploads'

    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Upload limit reached. ${cta}`,
          cta,
          retryAfter: rateLimit.resetAt.toISOString(),
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            (rateLimit.resetAt.getTime() - Date.now()) / 1000,
          ).toString(),
        },
      },
    )
  }

  // ─── 4. Parse JSON body ───────────────────────────────────────────
  let body: { fileName?: string; fileSizeBytes?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Expected JSON body' } },
      { status: 400 },
    )
  }

  const { fileName, fileSizeBytes } = body

  if (!fileName || typeof fileSizeBytes !== 'number') {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELDS', message: 'fileName and fileSizeBytes are required' } },
      { status: 400 },
    )
  }

  // ─── 5. Enforce file size limits (Req 13.1, 13.2, 13.3) ──────────
  const sizeLimit = ctx.tier === 'pro' ? PRO_SIZE_LIMIT : ANON_FREE_SIZE_LIMIT
  const tierLabel = ctx.tier === 'pro' ? 'Pro' : ctx.tier === 'free' ? 'Free' : 'Anonymous'

  if (fileSizeBytes > sizeLimit) {
    const limitMB = ctx.tier === 'pro' ? 25 : 10
    return NextResponse.json(
      {
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File exceeds the ${limitMB} MB limit for the ${tierLabel} plan.`,
          limit: sizeLimit,
          limitMB,
          tier: ctx.tier,
          tierName: tierLabel,
        },
      },
      { status: 413 },
    )
  }

  // ─── 6. Record upload ─────────────────────────────────────────────
  await recordUpload(identifier, identifierType)

  // ─── 7. Build response ────────────────────────────────────────────
  const newCount = rateLimit.count + 1

  // Nudge for anonymous users (Req 6.5)
  const nudge =
    ctx.tier === 'anonymous' && (newCount === 3 || newCount === 4)
      ? {
          message: 'Register to get 50 uploads/day',
          cta: 'Sign up free',
        }
      : undefined

  return NextResponse.json(
    {
      meta: {
        fileName,
        fileSizeBytes,
        tier: ctx.tier,
        uploadsUsed: newCount,
        uploadsLimit: rateLimit.limit === Infinity ? null : rateLimit.limit,
      },
      ...(nudge ? { nudge } : {}),
    },
    { status: 200 },
  )
}
