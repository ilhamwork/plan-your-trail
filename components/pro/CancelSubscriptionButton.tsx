"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

// ---------------------------------------------------------------------------
// CancelSubscriptionButton
//
// Renders the "Cancel subscription" CTA with a confirmation dialog before
// calling /api/subscription/cancel. Pro access continues until period_end.
//
// Requirements: 8.14, 10.2
// ---------------------------------------------------------------------------

interface CancelSubscriptionButtonProps {
  periodEnd: string
}

export function CancelSubscriptionButton({ periodEnd }: CancelSubscriptionButtonProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formattedEnd = new Date(periodEnd).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const handleCancel = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        setError(data?.error?.message ?? "Failed to cancel. Please try again.")
        setLoading(false)
        return
      }

      // Reload the page to reflect updated status
      router.refresh()
    } catch {
      setError("Network error. Please check your connection and try again.")
      setLoading(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
        <p className="text-sm font-semibold text-red-700">Cancel Pro subscription?</p>
        <p className="mt-1 text-xs text-red-600">
          You&apos;ll keep Pro access until{" "}
          <strong>{formattedEnd}</strong>. After that, your account reverts to
          Free and excess routes will be marked read-only.
        </p>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Cancelling…
              </span>
            ) : (
              "Yes, cancel"
            )}
          </button>
          <button
            onClick={() => {
              setShowConfirm(false)
              setError(null)
            }}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Keep subscription
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="text-xs font-semibold text-gray-400 underline underline-offset-2 transition hover:text-red-400"
    >
      Cancel subscription
    </button>
  )
}
