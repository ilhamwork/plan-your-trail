import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

export async function POST() {
  const supabase = await createSupabaseServerClient()

  // Sign out and clear the session cookie (Req 1.12)
  await supabase.auth.signOut()

  return NextResponse.json({ message: 'Logged out' }, { status: 200 })
}
