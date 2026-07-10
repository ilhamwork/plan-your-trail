'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Login page  (Req 1.8, 1.9, 1.10, 1.13, 1.14)
// ---------------------------------------------------------------------------

const MAX_FAILED_ATTEMPTS = 5

// Inner component that uses useSearchParams — must be inside a Suspense boundary
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectAfter = searchParams.get('redirectAfter') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedOut, setLockedOut] = useState(false)

  // ---------------------------------------------------------------------------
  // Email/password sign-in
  // ---------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (lockedOut) return

    setIsLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const newCount = failedAttempts + 1
      setFailedAttempts(newCount)

      if (newCount >= MAX_FAILED_ATTEMPTS) {
        setLockedOut(true)
        setError(null)
      } else {
        // Req 1.10: never say which field is wrong
        setError('Email or password is incorrect.')
      }
    } else {
      router.push(redirectAfter)
    }

    setIsLoading(false)
  }

  // ---------------------------------------------------------------------------
  // Google OAuth
  // ---------------------------------------------------------------------------

  async function handleGoogleSignIn() {
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (oauthError) {
      // Req 1.14: return user to unauthenticated state with error
      setError('Google sign-in failed. Please try again.')
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back to PlanYourTrail</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Lockout message — Req 1.13 */}
          {lockedOut && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              Too many failed attempts. Please wait 15 minutes before trying again.
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={lockedOut || isLoading}
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={lockedOut || isLoading}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" disabled={lockedOut || isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={lockedOut || isLoading}
          >
            <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <a href="/auth/register" className="text-foreground underline underline-offset-4">
              Sign up
            </a>
          </p>

          <p className="text-center text-sm text-muted-foreground">
            <a
              href="/auth/reset-password"
              className="text-foreground underline underline-offset-4"
            >
              Forgot password?
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Default export wraps LoginForm in Suspense to satisfy Next.js App Router's
// requirement that useSearchParams() callers are inside a Suspense boundary.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
