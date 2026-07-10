'use client'

import Link from 'next/link'

// ---------------------------------------------------------------------------
// Verify-email page  (Req 1.3, 1.5)
// ---------------------------------------------------------------------------

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-8 text-center ring-1 ring-foreground/10">
        {/* Email icon */}
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="size-6 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-xl font-semibold">Check your email</h1>

        <p className="mb-4 text-sm text-muted-foreground">
          Please check your email to verify your account.
        </p>

        <p className="mb-6 rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          You can use all Free features without verifying first.
        </p>

        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium underline underline-offset-4"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
