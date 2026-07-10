// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PAGES = ['/account', '/routes']
const AUTH_PAGES     = ['/auth/login', '/auth/register']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(),
                 setAll: (c) => c.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } }
  )

  // Refresh session — critical for 7-day persistence
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  if (PROTECTED_PAGES.some(p => path.startsWith(p)) && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectAfter', path)
    return NextResponse.redirect(loginUrl)
  }

  if (AUTH_PAGES.some(p => path.startsWith(p)) && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
