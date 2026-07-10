import { NextResponse } from 'next/server'
import { resolveTier } from '@/lib/access-guard'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------

export async function GET() {
  // Anonymous fallback
  const anonymousResponse = {
    user: null,
    tier: 'anonymous' as const,
    gracePeriodEndsAt: null,
    introUsed: false,
  }

  try {
    const ctx = await resolveTier()

    if (!ctx.userId) {
      return NextResponse.json(anonymousResponse)
    }

    // Fetch additional profile data
    const supabase = await createSupabaseServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json(anonymousResponse)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified, intro_price_used')
      .eq('id', ctx.userId)
      .single()

    return NextResponse.json({
      user: {
        id: authUser.id,
        email: authUser.email ?? '',
        emailVerified: profile?.email_verified ?? false,
      },
      tier: ctx.tier,
      gracePeriodEndsAt: ctx.gracePeriodEndsAt ? ctx.gracePeriodEndsAt.toISOString() : null,
      introUsed: profile?.intro_price_used ?? false,
    })
  } catch (err) {
    // If a 503 Response was thrown by resolveTier, propagate it
    if (err instanceof Response) {
      return err
    }
    // Any other error → treat as unauthenticated
    return NextResponse.json(anonymousResponse)
  }
}
