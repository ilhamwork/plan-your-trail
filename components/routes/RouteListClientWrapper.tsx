"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RouteList } from "@/components/routes/RouteList"
import type { SavedRoute } from "@/components/routes/RouteList"
import type { UserTier } from "@/lib/access-guard"

// ---------------------------------------------------------------------------
// RouteListClientWrapper
//
// Thin client wrapper that owns the routes array state so RouteList can
// optimistically remove items on delete without a full server re-render.
// ---------------------------------------------------------------------------

interface RouteListClientWrapperProps {
  initialRoutes: SavedRoute[]
  tier: UserTier
}

export function RouteListClientWrapper({
  initialRoutes,
  tier,
}: RouteListClientWrapperProps) {
  const router = useRouter()
  const [routes, setRoutes] = useState<SavedRoute[]>(initialRoutes)

  const handleDelete = (id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id))
    // Refresh server state in the background
    router.refresh()
  }

  const handleView = (id: string) => {
    router.push(`/?route=${id}`)
  }

  return (
    <RouteList
      routes={routes}
      tier={tier}
      onDelete={handleDelete}
      onView={handleView}
    />
  )
}
