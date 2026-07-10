"use client"

import type { UserTier } from "@/lib/access-guard"

interface ProGateProps {
  feature: string
  tier: UserTier
  fallback: React.ReactNode
  children: React.ReactNode
}

/**
 * Renders `children` when the user is on the Pro tier.
 * Renders `fallback` for any other tier.
 * Pro path uses a React Fragment — no extra DOM wrapper.
 *
 * Requirements: 4.5, 4.6
 */
export function ProGate({ tier, fallback, children }: ProGateProps) {
  if (tier === "pro") {
    return <>{children}</>
  }
  return <>{fallback}</>
}
