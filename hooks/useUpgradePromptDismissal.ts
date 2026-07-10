"use client"

import { useState, useEffect, useCallback } from "react"

interface UseUpgradePromptDismissalResult {
  dismissed: boolean
  dismiss: () => void
}

/**
 * Reads/writes sessionStorage key `upgrade_dismissed_${feature}`.
 * Handles SSR safely by initializing state via useEffect.
 */
export function useUpgradePromptDismissal(
  feature: string
): UseUpgradePromptDismissalResult {
  const key = `upgrade_dismissed_${feature}`

  // Start with false; hydrate from sessionStorage after mount (SSR-safe)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(key) === "true")
    } catch {
      // sessionStorage unavailable (e.g., private browsing restrictions)
    }
  }, [key])

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      sessionStorage.setItem(key, "true")
    } catch {
      // Best-effort
    }
  }, [key])

  return { dismissed, dismiss }
}
