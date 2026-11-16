"use client"

import { memo, useState, useMemo } from "react"
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
  Flag,
} from "lucide-react"
import type { Waypoint, TrackPoint } from "@/lib/types"
import { downloadGPX } from "@/lib/gpx-export"
import { formatKm, formatKmLabel } from "@/lib/format"
import { useEntitlements } from "@/lib/entitlements"
import { useI18n } from "@/lib/i18n/context"
import { trackEvent } from "@/lib/analytics/events"
import { joinWaitlistAction } from "@/app/actions/waitlist"
import { ComingSoonLock } from "./ComingSoonLock"

interface WaypointPanelProps {
  totalDistanceKm: number
  waypoints: Waypoint[]
  trackPoints: TrackPoint[]
  fileName?: string
  hideDownload?: boolean
  onAdd: (name: string, distanceKm: number) => void
  onEdit: (id: string, name: string, distanceKm: number) => void
  onRemove: (id: string) => void
}

export const WaypointPanel = memo(function WaypointPanel({
  totalDistanceKm,
  waypoints,
  trackPoints,
  fileName,
  hideDownload = false,
  onAdd,
  onEdit,
  onRemove,
}: WaypointPanelProps) {
  const { can, limits, user } = useEntitlements()
  const { t } = useI18n()
  const canManageWaypoints = can("waypoint_management")
  const canDownloadGpx = can("download_gpx")

  const [name, setName] = useState("")
  const [distanceStr, setDistanceStr] = useState("")
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false)
  const [isJoinedWaitlist, setIsJoinedWaitlist] = useState(false)

  const isPro = user?.plan === "pro"
  const maxCustom = limits.maxCustomWaypoints

  // Count only custom waypoints added by the user (explicitly isFromGpx === false)
  const customWaypointsCount = useMemo(
    () => waypoints.filter((wp) => wp.isFromGpx === false).length,
    [waypoints]
  )

  const isLimitReached =
    !isPro && maxCustom !== null && customWaypointsCount >= maxCustom

  const handleJoinProWaitlist = async () => {
    if (!user || isJoiningWaitlist || isJoinedWaitlist) return
    setIsJoiningWaitlist(true)
    try {
      const res = await joinWaitlistAction({ feature: "waypoint_management" })
      if (res.ok) {
        setIsJoinedWaitlist(true)
        trackEvent("waitlist_joined", {
          feature: "waypoint_management",
          source: "waypoint_panel_limit",
        })
      }
    } catch {
      // ignore
    } finally {
      setIsJoiningWaitlist(false)
    }
  }

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

    // Prevent adding new waypoints if limit is reached
    if (!editingId && isLimitReached) {
      setError(
        `Batas ${maxCustom} waypoint kustom tercapai. Upgrade ke Pro untuk waypoint tanpa batas.`
      )
      return
    }

    setError("")
    const trimmedName = name.trim()
    const cleanDist = distanceStr.trim().replace(",", ".")
    const km = parseFloat(cleanDist)

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

  // Sort waypoints by distance
  const sorted = [...waypoints].sort((a, b) => a.distance - b.distance)

  return (
    <section aria-label="Waypoint Rute">
      {canManageWaypoints ? (
        <>
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold tracking-tight text-[#111827]">
                {editingId ? t("waypointPanel.editTitle") : t("waypointPanel.title")}
              </h3>
              {isPro ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
                  {t("waypointPanel.proBadge")}
                </span>
              ) : (
                <span className="rounded-full bg-[#F1EDE8] px-2.5 py-0.5 text-xs font-semibold text-[#1B4332]">
                  {t("waypointPanel.freeBadge", {
                    used: customWaypointsCount,
                    max: maxCustom ?? 3,
                  })}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs font-medium text-[#4B5563]">
              {editingId
                ? t("waypointPanel.editSubtitle")
                : t("waypointPanel.subtitle")}
            </p>
          </div>
          
          {canManageWaypoints && !hideDownload && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading || trackPoints.length === 0}
                title={
                  canDownloadGpx
                    ? t("waypointPanel.downloadTitle")
                    : t("waypointPanel.downloadLockedTitle")
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-2 text-xs font-semibold text-[#2D3436] transition hover:border-[#1B4332] hover:bg-[#1B4332] hover:text-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDownloading ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/20 border-t-current" />
                ) : !canDownloadGpx ? (
                  <Lock className="h-3.5 w-3.5 text-amber-700" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>{t("waypointPanel.downloadGpx")}</span>
              </button>
            </div>
          )}

          {/* Input row */}
          <div className="mt-4 pb-2">
            {/* Limit Reached Banner for Free Users */}
            {isLimitReached && !editingId && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                    <span>
                      {t("waypointPanel.limitReached", { max: maxCustom ?? 3 })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleJoinProWaitlist}
                    disabled={isJoiningWaitlist || isJoinedWaitlist}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#1B4332] px-3 py-1.5 text-xs font-semibold text-[#FAF6F1] transition hover:bg-[#143326] disabled:opacity-60"
                  >
                    {isJoinedWaitlist ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>{t("waypointPanel.waitlistJoined")}</span>
                      </>
                    ) : (
                      <>
                        <Flag className="h-3.5 w-3.5 text-amber-300" />
                        <span>{t("waypointPanel.waitlistJoin")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError("")
                }}
                onKeyDown={handleKeyDown}
                disabled={isLimitReached && !editingId}
                aria-label="Nama waypoint"
                placeholder={
                  isLimitReached && !editingId
                    ? `Batas ${maxCustom} waypoint tercapai`
                    : "Nama pos (cth: WS 1 Sumber Air)"
                }
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-2 text-sm text-[#2D3436] placeholder-[#6B7280] transition focus:border-[#1B4332] focus-visible:outline-2 focus-visible:outline-[#1B4332] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-[#6B7280]"
              />
              <div className="relative w-28 shrink-0">
                <input
                  type="text"
                  inputMode="decimal"
                  value={distanceStr}
                  onChange={(e) => {
                    setDistanceStr(e.target.value)
                    setError("")
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isLimitReached && !editingId}
                  aria-label="Jarak waypoint dalam kilometer"
                  placeholder="0.0"
                  className="min-h-11 w-full rounded-xl border border-[#D1D5DB] bg-white px-3 py-2 pr-8 text-sm font-medium text-[#2D3436] tabular-nums placeholder-[#6B7280] transition focus:border-[#1B4332] focus-visible:outline-2 focus-visible:outline-[#1B4332] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-[#6B7280]"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-[#4B5563]">
                  km
                </span>
              </div>

              <div className="flex gap-1.5">
                {editingId ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 active:scale-95"
                      title="Simpan perubahan"
                      aria-label="Simpan perubahan waypoint"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D1D5DB] bg-white text-[#2D3436] transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95"
                      title="Batal edit"
                      aria-label="Batal edit waypoint"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLimitReached}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1B4332] text-[#FAF6F1] transition hover:bg-[#143326] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      isLimitReached
                        ? `Batas ${maxCustom} waypoint kustom tercapai`
                        : "Tambah waypoint"
                    }
                    aria-label="Tambah waypoint"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#B91C1C]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>
        </>
      ) : (
        <ComingSoonLock
          feature="waypoint_management"
          title={t("waypoints.lockedTitle")}
          description={t("authWall.waypointDesc")}
          source="waypoint_panel_gated"
          badgeText=""
          icon={MapPin}
          variant="inline"
          hideCta
          previewSlot={
            <div
              aria-hidden="true"
              className="mt-3.5 flex max-h-20 items-center justify-between gap-2 rounded-xl border border-[#E5E7EB]/80 bg-[#FAF6F1]/70 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-[#374151] ring-1 ring-[#E5E7EB]">
                  Water · KM 12
                </span>
                <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-[#374151] ring-1 ring-[#E5E7EB]">
                  Checkpoint · KM 24
                </span>
                <span className="hidden rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-[#374151] ring-1 ring-[#E5E7EB] sm:inline-block">
                  Aid Station · KM 30
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-[#1B4332]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1B4332]">
                {t("authWall.exampleBadge")}
              </span>
            </div>
          }
        />
      )}

      {/* Single-row Waypoint List */}
      {(canManageWaypoints || sorted.length > 0) && (
        <div className="mt-4 divide-y divide-[#E5E7EB]">
          {sorted.length === 0 ? (
            <p className="py-4 text-sm text-[#4B5563]">
              {t("waypointPanel.emptyState")}
            </p>
          ) : (
            sorted.map((wp) => (
              <div
                key={wp.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <MapPin
                    className="h-5 w-5 shrink-0 text-[#2D3436] stroke-[1.75]"
                    aria-hidden="true"
                  />
                  <span className="truncate text-[15px] font-normal text-[#2D3436]">
                    {wp.name}
                  </span>
                  {wp.isFromGpx && (
                    <span className="rounded-md bg-[#F1EDE8] px-2 py-0.5 text-[11px] font-semibold text-[#1B4332]">
                      GPX
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2 tabular-nums">
                  <span className="text-[15px] font-bold text-[#2D3436]">
                    {formatKmLabel(wp.distance)}
                  </span>

                  {canManageWaypoints && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(wp)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-[#4B5563] transition hover:bg-[#FAF6F1] hover:text-[#2D3436] focus-visible:outline-2 focus-visible:outline-[#1B4332]"
                        title="Edit waypoint"
                        aria-label={`Edit ${wp.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => wp.id && onRemove(wp.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-[#4B5563] transition hover:bg-red-50 hover:text-[#B91C1C] focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
                        title="Hapus waypoint"
                        aria-label={`Hapus ${wp.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
})
