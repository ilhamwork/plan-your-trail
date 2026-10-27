"use client"

import { useMemo } from "react"
import { useSession } from "../auth/client"
import { can, limits, type Feature } from "./can"
import type { SessionUser } from "../auth"

export function useEntitlements() {
  const { data: sessionData, isPending: isLoading } = useSession()

  const user: SessionUser | null = useMemo(() => {
    if (!sessionData?.user) return null
    return {
      id: sessionData.user.id,
      email: sessionData.user.email,
      plan: ((sessionData.user as { plan?: "free" | "pro" }).plan ?? "free") as
        | "free"
        | "pro",
    }
  }, [sessionData])

  const canAccess = useMemo(() => {
    return (feature: Feature) => can(user, feature)
  }, [user])

  const tierLimits = useMemo(() => {
    return limits(user)
  }, [user])

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    can: canAccess,
    limits: tierLimits,
  }
}
