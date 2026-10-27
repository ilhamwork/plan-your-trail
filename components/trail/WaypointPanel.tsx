"use client"

import { memo, useState } from "react"
import Link from "next/link"
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
  Sparkles,
} from "lucide-react"
import type { Waypoint, TrackPoint } from "@/lib/types"
import { downloadGPX } from "@/lib/gpx-export"
import { formatKm, formatKmLabel } from "@/lib/format"
import { useEntitlements } from "@/lib/entitlements"
import { trackEvent } from "@/lib/analytics/events"

interface WaypointPanelProps {
  totalDistanceKm: number
  waypoints: Waypoint[]
  trackPoints: TrackPoint[]
  fileName?: string
  onAdd: (name: string, distanceKm: number) => void
  onEdit: (id: string, name: string, distanceKm: number) => void
  onRemove: (id: string) => void
}

export const WaypointPanel = memo(function WaypointPanel({
  totalDistanceKm,
  waypoints,
  trackPoints,
  fileName,
  onAdd,
  onEdit,
  onRemove,
}: WaypointPanelProps) {
  const { can, user } = useEntitlements()
  const canManageWaypoints = can("waypoint_management")
  const canDownloadGpx = can("download_gpx")

  const [name, setName] = useState("")
  const [distanceStr, setDistanceStr] = useState("")
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [waitlistJoined, setWaitlistJoined] = useState(false)

  const routeName = fileName
    ? fileName.replace(/\.gpx$/i, "")
    : "route"

  const handleDownload = () => {
    if (!canDownloadGpx) {
      trackEvent("register_clicked", {
        source: "waypoint_download",
        feature: "download_gpx",
      })
      window.location.href = "/register"
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
    if (!canManageWaypoints || !wp.id) return
    setError("")
    setEditingId(wp.id)
    setName(wp.name)
    setDistanceStr(formatKm(wp.distance, 2))
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setName("")
    setDistanceStr("")
    setError("")
  }

  const handleSubmit = () => {
    if (!canManageWaypoints) return

    setError("")
    const trimmedName = name.trim()
    const km = parseFloat(distanceStr)

    if (!trimmedName) {
      setError("Silakan masukkan nama waypoint.")
      return
    }
    if (isNaN(km) || km < 0) {
      setError("Silakan masukkan jarak yang valid (≥ 0).")
      return
    }
    if (km > totalDistanceKm) {
      setError(
        `Jarak melebihi panjang rute (${totalDistanceKm.toFixed(1)} km).`
      )
      return
    }

    // Check for duplicate distance (within 0.05 km of a *different* waypoint)
    const duplicate = waypoints.find(
      (wp) => wp.id !== editingId && Math.abs(wp.distance / 1000 - km) < 0.05
    )
    if (duplicate) {
      setError(`Waypoint sudah ada di sekitar ${km.toFixed(2)} km.`)
      return
    }

    if (editingId) {
      onEdit(editingId, trimmedName, km)
      trackEvent("waypoint_edited", { source: "waypoint_panel" })
      setEditingId(null)
    } else {
      onAdd(trimmedName, km)
      trackEvent("waypoint_added", { source: "waypoint_panel" })
    }

    setName("")
    setDistanceStr("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
    if (e.key === "Escape" && editingId) handleCancelEdit()
  }

  const handleJoinWaitlist = () => {
    trackEvent("waitlist_joined", {
      feature: "waypoint_management",
      source: "waypoint_panel",
    })
    setWaitlistJoined(true)
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
              {editingId ? "Edit Waypoint" : "Waypoint Rute"}
            </h3>
            {canManageWaypoints ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                Pro
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                <Lock className="h-2.5 w-2.5" />
                Khusus Pro
              </span>
            )}
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading || trackPoints.length === 0}
            title={
              canDownloadGpx
                ? "Download GPX dengan waypoint"
                : "Daftar akun untuk download GPX"
            }
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 shadow-xs transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDownloading ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current/20 border-t-current" />
            ) : !canDownloadGpx ? (
              <Lock className="h-3 w-3 text-amber-600" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            Download GPX
          </button>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          {editingId
            ? "Ubah rincian waypoint terpilih"
            : "Kelola checkpoint, pos air, atau aid station"}
        </p>
      </div>

      {/* Input row or Pro Gated Prompt */}
      {canManageWaypoints ? (
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
              placeholder="Nama waypoint (cth: WS 1 Water)"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-[#2D3436] placeholder-gray-400 transition outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20"
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
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-7 text-xs font-medium text-[#2D3436] placeholder-gray-400 transition outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]/20"
              />
              <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px] font-semibold text-gray-400">
                km
              </span>
            </div>

            <div className="flex gap-1">
              {editingId ? (
                <>
                  <button
                    onClick={handleSubmit}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                    title="Simpan perubahan"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-600 shadow-xs transition hover:bg-gray-300 active:scale-95"
                    title="Batal edit"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1B4332] text-white shadow-xs transition hover:bg-[#143326] active:scale-95"
                  title="Tambah waypoint"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-500">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="border-b border-amber-100 bg-amber-50/60 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-semibold text-amber-900">
                  Manajemen Waypoint — Khusus Pro
                </p>
                <p className="text-[11px] text-amber-700">
                  Tambah dan edit pos air atau checkpoint kustom di peta & chart rute.
                </p>
              </div>
            </div>

            {user ? (
              waitlistJoined ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <Check className="h-3 w-3" />
                  Terdaftar Early Access
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleJoinWaitlist}
                  className="shrink-0 rounded-lg bg-[#1B4332] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#143326]"
                >
                  Daftar Early Access
                </button>
              )
            ) : (
              <Link
                href="/register"
                onClick={() =>
                  trackEvent("register_clicked", {
                    source: "waypoint_panel_gated",
                    feature: "waypoint_management",
                  })
                }
                className="shrink-0 rounded-lg bg-[#1B4332] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#143326]"
              >
                Daftar Akun
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Waypoint List */}
      <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
        {sorted.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            {canManageWaypoints
              ? "Belum ada waypoint. Tambahkan pos air atau aid station pertama kamu."
              : "Tidak ada waypoint pada file GPX ini."}
          </div>
        ) : (
          sorted.map((wp) => (
            <div
              key={wp.id}
              className="flex items-center justify-between px-4 py-2.5 transition hover:bg-gray-50/80"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                  {formatKmLabel(wp.distance)}
                </span>
                <span className="truncate text-xs font-medium text-[#2D3436]">
                  {wp.name}
                </span>
              </div>

              {canManageWaypoints && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEdit(wp)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Edit waypoint"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => wp.id && onRemove(wp.id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Hapus waypoint"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
})
