"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckoutButtonProps {
  plan: "monthly" | "annual"
  isAuthenticated: boolean
  label: string
  className?: string
}

// ---------------------------------------------------------------------------
// CheckoutButton
//
// Handles the full Midtrans Snap checkout flow:
//   1. POST /api/subscription/checkout to get a snapToken
//   2. Invoke window.snap.pay() with the token
//   3. Redirect on success; show error on failure
//
// Requirements: 8.7, 8.12 (Task 15.1 — wired here for use on the pricing page)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: unknown) => void
          onError?: (result: unknown) => void
          onPending?: (result: unknown) => void
          onClose?: () => void
        },
      ) => void
    }
  }
}

export function CheckoutButton({
  plan,
  isAuthenticated,
  label,
  className,
}: CheckoutButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirectAfter=/pricing`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Surface meaningful error codes to the user
        if (data?.error?.code === "EMAIL_NOT_VERIFIED") {
          setError(
            "Please verify your email address before upgrading. Check your inbox.",
          )
        } else if (data?.error?.code === "TIER_INSUFFICIENT") {
          setError("You already have an active Pro subscription.")
        } else if (data?.error?.code === "PAYMENT_GATEWAY_ERROR") {
          setError(
            "Payment gateway is temporarily unavailable. Please try again in a moment.",
          )
        } else {
          setError(data?.error?.message ?? "Something went wrong. Please try again.")
        }
        return
      }

      const { snapToken } = data

      // Invoke Midtrans Snap overlay
      if (!window.snap) {
        setError(
          "Payment widget failed to load. Please refresh the page and try again.",
        )
        return
      }

      window.snap.pay(snapToken, {
        onSuccess: () => {
          router.push("/account?upgraded=1")
        },
        onError: () => {
          setError(
            "Payment was not completed. Your subscription has not been changed.",
          )
          setLoading(false)
        },
        onPending: () => {
          router.push("/account?pending=1")
        },
        onClose: () => {
          // User dismissed the popup without completing
          setLoading(false)
        },
      })
    } catch {
      setError("Network error. Please check your connection and try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/20 border-t-current" />
            Processing…
          </span>
        ) : (
          label
        )}
      </button>
      {error && (
        <p className="max-w-sm text-center text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
