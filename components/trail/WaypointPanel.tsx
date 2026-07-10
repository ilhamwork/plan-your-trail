"use client"

import { useState } from "react"
import {
  Plus,
  MapPin,
  Trash2,
  AlertCircle,
  Pencil,
  X,
  Check,
  Download,
  Lock,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Waypoint, TrackPoint } from "@/lib/types"
import type { UserTier } from "@/lib/access-guard"
import { downloadGPX } from "@/lib/gpx-export"
import { UpgradePrompt } from "@/components/pro/UpgradePrompt"

interface WaypointPanelProps {
  totalDistanceKm: number
  waypoints: Waypoint[]
  trackPoints: TrackPoint[]
  fileName?: string
  tier?: UserTier
  onAdd: (name: string, distanceKm: number) => void
  onEdit: (id: string, name: string, distanceKm: number) => void
  onRemove: (id: string) => void
}

export function WaypointPanel({
  totalDistanceKm,
  waypoints,
  trackPoints,
  fileName,
  tier = "free",
  onAdd,
  onEdit,
  onRemove,
}: WaypointPanelProps) {
  const isPro = tier === "pro"
  const [name, setName] = useState("")
  const [distanceStr, setDistanceStr] = useState("")
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showUpgradeSheet, setShowUpgradeSheet] = useState(false)

  const routeName = fileName
    ? fileName.replace(/\.gpx$/i, "")
    : "route"

  const handleDownload = () => {
    if (!isPro) {
      setShowUpgradeSheet(true)
      return
    }
    setIsDownloading(true)
    try {
      downloadGPX(trackPoints, waypoints, routeName)
    } finally {
      setIsDownloading(false)
    }
  }

  // Populate inputs when entering edit mode
  const handleStartEdit = (wp: Waypoint) => {
    if (!wp.id) return
    setError("")
    setEditingId(wp.id)
    setName(wp.name)
    setDistanceStr((wp.distance / 1000).toFixed(2))
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setName("")
    setDistanceStr("")
    setError("")
  }

  const handleSubmit = () => {
    setError("")
    const trimmedName = name.trim()
    const km = parseFloat(distanceStr)

    if (!trimmedName) {
      setError("Please enter a waypoint name.")
      return
    }
    if (isNaN(km) || km < 0) {
      setError("Please enter a valid distance (≥ 0).")
      return
    }
    if (km > totalDistanceKm) {
      setError(
        `Distance exceeds route length (${totalDistanceKm.toFixed(1)} km).`
      )
      return
    }

    // Check for duplicate distance (within 0.05 km of a *different* waypoint)
    const duplicate = waypoints.find(
      (wp) => wp.id !== editingId && Math.abs(wp.distance / 1000 - km) < 0.05
    )
    if (duplicate) {
      setError(`A waypoint already exists near ${km.toFixed(2)} km.`)
      return
    }

    if (editingId) {
      onEdit(editingId, trimmedName, km)
      setEditingId(null)
    } else {
      onAdd(trimmedName, km)
    }

    setName("")
    setDistanceStr("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
    if (e.key === "Escape" && editingId) handleCancelEdit()
  }

  // Sort waypoints by distance
  const sorted = [...waypoints].sort((a, b) => a.distance - b.distance)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#E76F51]" />
            <h3 className="text-sm font-bold text-[#2D3436]">
              {editingId ? "Edit Waypoint" : "Route Waypoints"}
            </h3>
            {!isPro && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                <Lock className="h-2.5 w-2.5" />
                Pro
              </span>
            )}
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading || trackPoints.length === 0}
            title="Download GPX with waypoints"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 shadow-sm transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDownloading ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current/20 border-t-current" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            Download GPX
          </button>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          {editingId
            ? "Modify the selected waypoint details"
            : "Manage checkpoints, water, or aid stations"}
        </p>
      </div>

      {/* Input row */}
      <div className="border-b border-gray-50 bg-gray-50/50 px-4 pt-3 pb-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError("")
            }}
            onKeyDown={handleKeyDown}
            placeholder="Waypoint name"
            disabled={!isPro}
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-[#2D3436] placeholder-gray-400 transition outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          />
          <div className="relative w-24 shrink-0">
            <input
              type="number"
              value={distanceStr}
              onChange={(e) => {
                setDistanceStr(e.target.value)
                setError("")
              }}
              onKeyDown={handleKeyDown}
              placeholder="0.0"
              min={0}
              max={totalDistanceKm}
              step={0.01}
              disabled={!isPro}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-7 text-xs font-medium text-[#2D3436] placeholder-gray-400 transition outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            />
            <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px] font-semibold text-gray-400">
              km
            </span>
          </div>

          <div className="flex gap-1">
            {editingId ? (
              <>
                <button
                  onClick={isPro ? handleSubmit : () => setShowUpgradeSheet(true)}
                  disabled={isDownloading}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  title={isPro ? "Save changes" : "Upgrade to Pro to edit waypoints"}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-600 shadow-sm transition hover:bg-gray-300 active:scale-95"
                  title="Cancel edit"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={isPro ? handleSubmit : () => setShowUpgradeSheet(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1B4332] text-white shadow-sm transition hover:bg-[#1B4332]/80 active:scale-95"
                title={isPro ? "Add waypoint" : "Upgrade to Pro to add waypoints"}
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        <AnimatePresence border-none>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1.5 flex items-center gap-1 overflow-hidden"
            >
              <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />
              <p className="text-[11px] text-red-500">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Waypoint list */}
      <div className="max-h-40 divide-y divide-gray-50 overflow-y-auto">
        <AnimatePresence>
          {sorted.length > 0 ? (
            sorted.map((wp) => {
              const isEditingThis = editingId === wp.id
              return (
                <motion.div
                  key={wp.id || `${wp.name}-${wp.distance}`}
                  layout
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-center justify-between px-4 py-2.5 transition-colors ${
                    isEditingThis ? "bg-emerald-50/50" : "hover:bg-gray-50/40"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        wp.isFromGpx ? "bg-[#2A9D8F]" : "bg-[#E76F51]"
                      }`}
                    />
                    <div className="flex min-w-0 flex-col">
                      <p className="truncate text-xs font-semibold text-[#2D3436]">
                        {wp.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-gray-400">
                          {(wp.distance / 1000).toFixed(2)} km
                        </span>
                        <span
                          className={`py-0.2 rounded px-1 text-[8px] font-bold ${
                            wp.isFromGpx
                              ? "bg-[#2A9D8F]/10 text-[#2A9D8F]"
                              : "bg-[#E76F51]/10 text-[#E76F51]"
                          }`}
                        >
                          {wp.isFromGpx ? "GPX" : "Manual"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-2 flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => isPro ? handleStartEdit(wp) : setShowUpgradeSheet(true)}
                      disabled={isEditingThis}
                      className={`rounded p-1 transition ${
                        isEditingThis
                          ? "text-emerald-500"
                          : isPro
                            ? "text-gray-300 hover:bg-gray-100 hover:text-gray-600"
                            : "text-gray-300 hover:bg-gray-100 hover:text-gray-600"
                      }`}
                      title={isPro ? "Edit waypoint" : "Upgrade to Pro to edit waypoints"}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => isPro && wp.id ? onRemove(wp.id) : setShowUpgradeSheet(true)}
                      disabled={isEditingThis}
                      className={`rounded p-1 transition ${
                        isPro
                          ? "text-gray-300 hover:bg-red-50 hover:text-red-400"
                          : "text-gray-300 hover:bg-gray-100 hover:text-gray-600"
                      }`}
                      title={isPro ? "Remove waypoint" : "Upgrade to Pro to remove waypoints"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              )
            })
          ) : (
            <p className="px-4 py-4 text-center text-xs text-gray-400">
              No waypoints on this route.
            </p>
          )}
        </AnimatePresence>
      </div>
      {/* Pro upgrade sheet — shown when any waypoint/download action is triggered by non-Pro */}
      <AnimatePresence>
        {showUpgradeSheet && (
          <UpgradePrompt
            variant="sheet"
            feature="waypoints"
            open={showUpgradeSheet}
            title="Waypoints — Pro Feature"
            description="Upgrade to Pro to add, edit, and download waypoints on your routes."
            onUpgrade={() => setShowUpgradeSheet(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
