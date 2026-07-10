"use client"

import { useState, useCallback } from "react"
import { Save, Loader2 } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { UpgradePrompt } from "@/components/pro/UpgradePrompt"
import type { UserTier } from "@/lib/access-guard"
import type { SavedRoute } from "@/components/routes/RouteList"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SaveRouteButtonProps {
  /** Serialisable payload to POST to /api/routes */
  routeData: object
  tier: UserTier
  currentRouteCount: number
  onSaved: (routeId: string) => void
  /** Optional label override */
  label?: string
}

// ---------------------------------------------------------------------------
// Free-tier route limit
// ---------------------------------------------------------------------------

const FREE_ROUTE_LIMIT = 3

// ---------------------------------------------------------------------------
// RoutePicker — small modal to choose a route to delete
// ---------------------------------------------------------------------------

interface RoutePickerProps {
  routes: SavedRoute[]
  onSelect: (id: string) => void
  onCancel: () => void
  isDeleting: boolean
}

function RoutePicker({ routes, onSelect, onCancel, isDeleting }: RoutePickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Sheet / dialog */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-gray-100 bg-white px-5 py-5 shadow-2xl">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#2D3436]">Select a route to delete</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            The selected route will be soft-deleted, then your new route will be saved automatically.
          </p>
        </div>

        <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {routes.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => onSelect(r.id)}
                disabled={isDeleting}
                className="flex w-full items-center gap-3 px-2 py-3 text-left transition rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2D3436] truncate">
                    {r.race_name || r.file_name}
                  </p>
                  {r.race_name && (
                    <p className="text-[11px] text-gray-400 truncate">{r.file_name}</p>
                  )}
                </div>
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400 shrink-0" />
                ) : (
                  <span className="text-[11px] text-[#E76F51] font-semibold shrink-0">Delete →</span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={onCancel}
          className="mt-3 w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SaveRouteButton
// Requirements: 5.3, 5.4, 5.5
// ---------------------------------------------------------------------------

export function SaveRouteButton({
  routeData,
  tier,
  currentRouteCount,
  onSaved,
  label = "Save Route",
}: SaveRouteButtonProps) {
  const isAtLimit = tier !== "pro" && currentRouteCount >= FREE_ROUTE_LIMIT

  // Sheet visibility (shown when Free user hits limit)
  const [showSheet, setShowSheet] = useState(false)
  // Route picker visibility (shown when user picks "Delete a route")
  const [showPicker, setShowPicker] = useState(false)
  // Existing routes fetched for the picker
  const [existingRoutes, setExistingRoutes] = useState<SavedRoute[]>([])
  // Loading states
  const [isSaving, setIsSaving] = useState(false)
  const [isFetchingRoutes, setIsFetchingRoutes] = useState(false)
  const [isDeletingRoute, setIsDeletingRoute] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Core save logic — POST /api/routes
  // ---------------------------------------------------------------------------

  const saveRoute = useCallback(async (): Promise<string | null> => {
    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(routeData),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error?.message ?? "Failed to save route")
    }

    const data = await res.json()
    return data.route?.id ?? null
  }, [routeData])

  // ---------------------------------------------------------------------------
  // Direct save (Pro user or user under limit)
  // ---------------------------------------------------------------------------

  const handleDirectSave = async () => {
    setSaveError(null)
    setIsSaving(true)
    try {
      const routeId = await saveRoute()
      if (routeId) onSaved(routeId)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save route")
    } finally {
      setIsSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // "Delete a route" flow
  // Step 1: fetch existing routes and show picker
  // ---------------------------------------------------------------------------

  const handleOpenDeletePicker = async () => {
    setShowPicker(true)
    setIsFetchingRoutes(true)
    try {
      const res = await fetch("/api/routes")
      if (!res.ok) throw new Error("Failed to fetch routes")
      const data = await res.json()
      setExistingRoutes(data.routes ?? [])
    } catch {
      setExistingRoutes([])
    } finally {
      setIsFetchingRoutes(false)
    }
  }

  // ---------------------------------------------------------------------------
  // "Delete a route" flow
  // Step 2: soft-delete selected route, then auto-save (Req 5.5)
  // ---------------------------------------------------------------------------

  const handleSelectRouteToDelete = async (id: string) => {
    setSaveError(null)
    setIsDeletingRoute(true)
    try {
      // 1. Soft-delete the selected route
      const delRes = await fetch(`/api/routes/${id}`, { method: "DELETE" })
      if (!delRes.ok) {
        const data = await delRes.json().catch(() => ({}))
        throw new Error(data?.error?.message ?? "Failed to delete route")
      }

      // 2. Auto-save the pending route without a second click (Req 5.5)
      const routeId = await saveRoute()

      // 3. Close all overlays
      setShowPicker(false)
      setShowSheet(false)
      setExistingRoutes([])

      if (routeId) onSaved(routeId)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong")
      setShowPicker(false)
    } finally {
      setIsDeletingRoute(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Click handler — decide immediate save vs. show upgrade sheet
  // ---------------------------------------------------------------------------

  const handleClick = () => {
    if (isAtLimit) {
      setShowSheet(true)
    } else {
      handleDirectSave()
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Save button */}
      <button
        onClick={handleClick}
        disabled={isSaving}
        className="inline-flex items-center gap-2 rounded-xl bg-[#1B4332] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1B4332]/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {isSaving ? "Saving…" : label}
      </button>

      {/* Inline error */}
      {saveError && (
        <p className="mt-1.5 text-xs text-red-500">{saveError}</p>
      )}

      {/* Upgrade / delete sheet — shown when Free user hits limit (Req 5.3, 5.4) */}
      <AnimatePresence>
        {showSheet && (
          <UpgradePrompt
            variant="sheet"
            feature="save_limit"
            title="Save Limit Reached"
            description="Free plan allows up to 3 saved routes. Upgrade to Pro for unlimited storage."
            onUpgrade={() => setShowSheet(false)}
            onDeleteRoute={handleOpenDeletePicker}
          />
        )}
      </AnimatePresence>

      {/* Route picker — shown when user chooses "Delete a route" */}
      <AnimatePresence>
        {showPicker && (
          <RoutePicker
            routes={isFetchingRoutes ? [] : existingRoutes}
            onSelect={handleSelectRouteToDelete}
            onCancel={() => {
              setShowPicker(false)
              setExistingRoutes([])
            }}
            isDeleting={isDeletingRoute || isFetchingRoutes}
          />
        )}
      </AnimatePresence>
    </>
  )
}
