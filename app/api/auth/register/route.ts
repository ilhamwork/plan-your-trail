import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Password validation
// ---------------------------------------------------------------------------

interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.')
  }
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters.')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.')
  }

  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { email, password } = body as { email?: unknown; password?: unknown }

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }
  if (typeof password !== 'string') {
    return NextResponse.json({ error: 'Password is required.' }, { status: 400 })
  }

  // Validate password rules (Req 1.1)
  const validation = validatePassword(password)
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Password does not meet requirements.', details: validation.errors },
      { status: 400 },
    )
  }

  // Sign up via SSR client (sends verification email automatically — Req 1.3)
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  })

  // Handle duplicate email (Req 1.4)
  if (error) {
    // Supabase returns "User already registered" for duplicate emails
    if (
      error.message.toLowerCase().includes('already registered') ||
      error.message.toLowerCase().includes('already been registered') ||
      error.message.toLowerCase().includes('email address is already')
    ) {
      return NextResponse.json(
        {
          error:
            'An account with this email address already exists. Please log in or use a different email.',
        },
        { status: 409 },
      )
    }

    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data.user) {
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }

  const newUser = data.user

  // Check deleted_account_flags for introductory price inheritance (Req 12.6)
  try {
    const emailHash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
    const admin = createSupabaseAdminClient()

    const { data: deletedFlag } = await admin
      .from('deleted_account_flags')
      .select('intro_used')
      .eq('email_hash', emailHash)
      .single()

    if (deletedFlag?.intro_used === true) {
      // Inherit the intro_price_used flag on the newly created profile
      await admin
        .from('profiles')
        .update({
          intro_price_used: true,
          intro_price_used_at: new Date().toISOString(),
        })
        .eq('id', newUser.id)
    }
  } catch {
    // Non-fatal: if the flag lookup fails, proceed without inheritance
    // The introductory price check will fall back to the profile default (false)
  }

  // Req 1.5: Free access is available immediately without email verification.
  // Supabase has already sent the verification email (Req 1.3).

  return NextResponse.json(
    {
      user: {
        id: newUser.id,
        email: newUser.email,
      },
      message:
        'Registration successful. Please check your email to verify your account.',
    },
    { status: 201 },
  )
}
