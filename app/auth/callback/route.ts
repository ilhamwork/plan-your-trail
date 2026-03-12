import { NextResponse } from 'next/server'
// The client you created in Step 1
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
    const intent = searchParams.get('intent')
    const next = searchParams.get('next') ?? '/'
 
    if (code) {
      const supabase = await createClient()
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && session?.user) {
        const user = session.user
        
        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (intent === 'signup') {
          // Explicitly upsert profile data ONLY during registration
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
              avatar_url: user.user_metadata?.avatar_url || '',
              email: user.email || '',
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })

          if (profileError) {
            console.error('Error syncing profile during signup:', profileError)
          }
        } else if (intent === 'signin' && !profile) {
          // Strict Login Rejection: If user tries to sign in but has no profile, sign them out
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/?error=user_not_found`)
        }

        if (next) {
          return NextResponse.redirect(`${origin}${next}`)
        }
        return NextResponse.redirect(`${origin}/`)
      } else {
        console.error('Auth callback error:', error)
      }
    }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
