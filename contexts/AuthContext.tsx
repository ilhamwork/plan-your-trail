'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
}

type UserTier = 'anonymous' | 'free' | 'pro'

export interface AuthContextValue {
  user: AuthUser | null
  tier: UserTier
  gracePeriodEndsAt: Date | null
  introUsed: boolean
  isLoading: boolean
  /** Sign out the current user and reset context state. */
  signOut: () => Promise<void>
  /** Re-fetch /api/auth/me to sync tier and user data. */
  refreshTier: () => Promise<void>
  /**
   * Ref that other components can write GPX data into before triggering
   * sign-in. On SIGNED_IN the context will auto-post it to /api/routes.
   */
  pendingGpxData: React.MutableRefObject<unknown>
  /** Whether the pending auto-save failed (allows consumers to show retry UI). */
  autoSaveFailed: boolean
  /** Clear the auto-save failed flag (e.g. after a manual retry). */
  clearAutoSaveFailed: () => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const ANONYMOUS_STATE = {
  user: null,
  tier: 'anonymous' as const,
  gracePeriodEndsAt: null,
  introUsed: false,
}

interface MeResponse {
  user: AuthUser | null
  tier: UserTier
  gracePeriodEndsAt: string | null
  introUsed: boolean
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [tier, setTier] = useState<UserTier>('anonymous')
  const [gracePeriodEndsAt, setGracePeriodEndsAt] = useState<Date | null>(null)
  const [introUsed, setIntroUsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [autoSaveFailed, setAutoSaveFailed] = useState(false)

  // Ref exposed to other components so they can queue GPX data before sign-in
  const pendingGpxData = useRef<unknown>(null)

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const applyMeResponse = useCallback((data: MeResponse) => {
    setUser(data.user)
    setTier(data.tier)
    setGracePeriodEndsAt(data.gracePeriodEndsAt ? new Date(data.gracePeriodEndsAt) : null)
    setIntroUsed(data.introUsed)
  }, [])

  const refreshTier = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data: MeResponse = await res.json()
        applyMeResponse(data)
      }
    } catch {
      // Network error — silently ignore; keep current state
    }
  }, [applyMeResponse])

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Best-effort
    }
    // Sign out via browser client as well to clear local storage / cookie
    await supabase.auth.signOut()
    setUser(null)
    setTier('anonymous')
    setGracePeriodEndsAt(null)
    setIntroUsed(false)
  }, [])

  const clearAutoSaveFailed = useCallback(() => setAutoSaveFailed(false), [])

  // ---------------------------------------------------------------------------
  // Mount: hydrate from /api/auth/me
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const res = await fetch('/api/auth/me')
        if (!cancelled && res.ok) {
          const data: MeResponse = await res.json()
          applyMeResponse(data)
        }
      } catch {
        // Network error — start as anonymous
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    hydrate()
    return () => {
      cancelled = true
    }
  }, [applyMeResponse])

  // ---------------------------------------------------------------------------
  // Supabase auth state listener
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        // Re-fetch the full tier context from the server
        await refreshTier()

        // If there's pending GPX data from an anonymous session, auto-save it
        if (pendingGpxData.current) {
          const payload = pendingGpxData.current
          pendingGpxData.current = null // clear before the async call

          try {
            const res = await fetch('/api/routes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            if (!res.ok) {
              throw new Error(`Auto-save failed with status ${res.status}`)
            }
          } catch {
            // Restore the data so the user can retry manually
            pendingGpxData.current = payload
            setAutoSaveFailed(true)
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setTier('anonymous')
        setGracePeriodEndsAt(null)
        setIntroUsed(false)
        setAutoSaveFailed(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [refreshTier])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AuthContext.Provider
      value={{
        user,
        tier,
        gracePeriodEndsAt,
        introUsed,
        isLoading,
        signOut,
        refreshTier,
        pendingGpxData,
        autoSaveFailed,
        clearAutoSaveFailed,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
