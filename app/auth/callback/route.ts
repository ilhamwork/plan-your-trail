import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// GET /auth/callback — OAuth code exchange  (Req 1.2)
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const redirectAfter = searchParams.get('redirectAfter') || '/'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(redirectAfter, origin))
    }
  }

  // On failure redirect to login with an error hint
  const loginUrl = new URL('/auth/login', origin)
  loginUrl.searchParams.set('error', 'oauth_callback_failed')
  return NextResponse.redirect(loginUrl)
}
