"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/lib/auth/client"
import { saveRouteAction } from "@/app/actions/routes"
import { trackEvent } from "@/lib/analytics/events"
import type { Waypoint } from "@/lib/types"

export const PENDING_ROUTE_KEY = "pyt_pending_route"

export interface PendingRouteData {
  gpxContent: string
  fileName: string
  raceName: string
  raceDate?: string
  runnerName?: string
  waypoints?: Waypoint[]
}

const SESSION_STORAGE_SAFE_CHARS = 2_000_000

function compactGpxForSessionStorage(gpx: string): string {
  if (gpx.length <= SESSION_STORAGE_SAFE_CHARS) {
    return gpx
  }

  let compact = gpx
    .replace(/<extensions>[\s\S]*?<\/extensions>/gi, "")
    .replace(/<time>[^<]*<\/time>/gi, "")
    .replace(/>\s+</g, "><")

  if (compact.length <= SESSION_STORAGE_SAFE_CHARS) {
    return compact
  }

  let idx = 0
  compact = compact.replace(
    /<trkpt\b[^>]*>[\s\S]*?<\/trkpt>|<trkpt\b[^>]*\/>/gi,
    (match) => {
      idx++
      return idx % 5 === 1 ? match : ""
    }
  )
  return compact
}

/**
 * Saves pending route data to sessionStorage so an anonymous user's analysis
 * survives the redirect through registration or login, compacting large GPX
 * strings if needed to stay within browser 5 MB sessionStorage quota.
 */
export function storePendingRoute(data: PendingRouteData): void {
  try {
    sessionStorage.setItem(PENDING_ROUTE_KEY, JSON.stringify(data))
  } catch {
    try {
      const compacted: PendingRouteData = {
        ...data,
        gpxContent: compactGpxForSessionStorage(data.gpxContent),
      }
      sessionStorage.setItem(PENDING_ROUTE_KEY, JSON.stringify(compacted))
    } catch (err) {
      console.warn("Could not save pending route to sessionStorage:", err)
    }
  }
}

/**
 * Clears pending route data from sessionStorage.
 */
export function clearPendingRoute(): void {
  try {
    sessionStorage.removeItem(PENDING_ROUTE_KEY)
  } catch {
    // ignore
  }
}

export function usePendingRouteSave() {
  const { data: sessionData } = useSession()
  const user = sessionData?.user

  const [isSaving, setIsSaving] = useState(false)
  const [savedRouteId, setSavedRouteId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Auto-save pending route if user just logged in or registered
  useEffect(() => {
    if (!user) return

    let pending: PendingRouteData | null = null
    try {
      const raw = sessionStorage.getItem(PENDING_ROUTE_KEY)
      if (raw) {
        pending = JSON.parse(raw)
      }
    } catch {
      pending = null
    }

    if (!pending || !pending.gpxContent) return

    const autoSave = async () => {
      setIsSaving(true)
      try {
        const res = await saveRouteAction({
          name: pending!.raceName || pending!.fileName || "Rute Saya",
          gpxContent: pending!.gpxContent,
          raceDate: pending!.raceDate,
          runnerName: pending!.runnerName,
          waypoints: pending!.waypoints,
        })

        if (res.ok) {
          setSavedRouteId(res.data.routeId)
          setSaveMessage("Rute dari sesi sebelumnya berhasil disimpan ke akun Anda!")
          clearPendingRoute()
          trackEvent("route_saved", {
            source: "anonymous_conversion",
            routeId: res.data.routeId,
          })
        } else {
          setSaveError(res.error.message)
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Gagal menyimpan rute.")
      } finally {
        setIsSaving(false)
      }
    }

    autoSave()
  }, [user])

  // Explicit manual save handler
  const saveRoute = useCallback(
    async (data: PendingRouteData) => {
      if (!user) {
        // Not authenticated: store in sessionStorage and return unauthenticated
        storePendingRoute(data)
        return {
          ok: false,
          needsAuth: true,
        }
      }

      setIsSaving(true)
      setSaveError(null)
      try {
        const res = await saveRouteAction({
          name: data.raceName || data.fileName || "Rute Saya",
          gpxContent: data.gpxContent,
          raceDate: data.raceDate,
          runnerName: data.runnerName,
          waypoints: data.waypoints,
        })

        if (res.ok) {
          setSavedRouteId(res.data.routeId)
          setSaveMessage("Rute berhasil disimpan!")
          clearPendingRoute()
          trackEvent("route_saved", {
            source: "user_action",
            routeId: res.data.routeId,
          })
          return { ok: true, routeId: res.data.routeId }
        } else {
          setSaveError(res.error.message)
          return { ok: false, error: res.error.message }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal menyimpan rute."
        setSaveError(msg)
        return { ok: false, error: msg }
      } finally {
        setIsSaving(false)
      }
    },
    [user]
  )

  return {
    isSaving,
    savedRouteId,
    saveMessage,
    saveError,
    setSaveError,
    setSaveMessage,
    saveRoute,
  }
}
