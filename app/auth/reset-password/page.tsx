'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Reset-password page  (Req 1.7)
// ---------------------------------------------------------------------------

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim())

    if (resetError) {
      // Req 1.7: if Supabase indicates the email is not verified, show specific message
      if (
        resetError.message.toLowerCase().includes('not confirmed') ||
        resetError.message.toLowerCase().includes('not verified') ||
        resetError.message.toLowerCase().includes('email not confirmed')
      ) {
        setError('Please verify your email before resetting your password.')
      } else {
        setError(resetError.message)
      }
    } else {
      setSuccess(true)
    }

    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {success ? (
            <div className="rounded-lg bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
              Password reset email sent. Check your inbox.
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    placeholder="you@example.com"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <a href="/auth/login" className="text-foreground underline underline-offset-4">
              Back to sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
