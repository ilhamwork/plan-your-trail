"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Share2, ArrowDownToLine, Trash2, Check } from "lucide-react"
import type { Route } from "@/lib/db/schema"
import type { TrackPoint } from "@/lib/types"

interface RouteCardProps {
  route: Route
  onDelete: (route: Route) => void
}

export function RouteCard({ route, onDelete }: RouteCardProps) {
  const [copied, setCopied] = useState(false)

  const metrics = route.metrics as {
    stats?: {
      totalDistance?: number
      elevationGain?: number
      elevationLoss?: number
      highestPoint?: number
    }
    raceDate?: string
    runnerName?: string
  }

  const totalDist = metrics?.stats?.totalDistance || 0
  const distanceKm = (totalDist / 1000).toFixed(2)

  const elevationGainM = metrics?.stats?.elevationGain
    ? Math.round(metrics.stats.elevationGain)
    : 0

  const kmEffort = (totalDist / 1000 + elevationGainM * 0.01).toFixed(1)

  let formattedDate = ""
  if (metrics?.raceDate) {
    try {
      const d = new Date(metrics.raceDate)
      if (!isNaN(d.getTime())) {
        formattedDate = new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(d)
      } else {
        formattedDate = metrics.raceDate
      }
    } catch {
      formattedDate = metrics.raceDate
    }
  } else if (route.createdAt) {
    formattedDate = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(route.createdAt))
  }

  // Build 2D GPS Trail Route Map projection
  const mapData = useMemo(() => {
    const pts = (route.trackSimplified as TrackPoint[] | null) || []
    if (pts.length < 2) return null

    let minLat = Infinity
    let maxLat = -Infinity
    let minLon = Infinity
    let maxLon = -Infinity

    for (const p of pts) {
      if (p.lat < minLat) minLat = p.lat
      if (p.lat > maxLat) maxLat = p.lat
      if (p.lon < minLon) minLon = p.lon
      if (p.lon > maxLon) maxLon = p.lon
    }

    const midLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180)
    const cosLat = Math.cos(midLatRad)

    const spanX = Math.max((maxLon - minLon) * cosLat, 0.00001)
    const spanY = Math.max(maxLat - minLat, 0.00001)

    const width = 360
    const height = 260
    const pad = 28
    const usableW = width - pad * 2
    const usableH = height - pad * 2

    const scale = Math.min(usableW / spanX, usableH / spanY)
    const offsetX = pad + (usableW - spanX * scale) / 2
    const offsetY = pad + (usableH - spanY * scale) / 2

    const coords = pts.map((p) => {
      const x = offsetX + (p.lon - minLon) * cosLat * scale
      // Invert Y so north is top
      const y = offsetY + (maxLat - p.lat) * scale
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }
    })

    const path = `M ${coords.map((c) => `${c.x},${c.y}`).join(" L ")}`
    const startPoint = coords[0]
    const endPoint = coords[coords.length - 1]

    return { path, startPoint, endPoint }
  }, [route.trackSimplified])

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const shareUrl = `${window.location.origin}/routes/${route.id}`
    const shareTitle = `${route.name} - PlanYourTrail`

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Cek rute trail running ${route.name} (${distanceKm} km, +${elevationGainM} m):`,
          url: shareUrl,
        })
        return
      } catch {
        // user cancelled or share failed, fallback to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // copy failed
    }
  }

  return (
    <article className="group relative">
      {/* Toast Notification when link copied */}
      {copied && (
        <div
          role="status"
          className="absolute top-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#1B4332] px-3.5 py-1 text-xs font-semibold text-white shadow-lg animate-in fade-in"
        >
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Tautan rute disalin!
          </span>
        </div>
      )}

      <div>
        {/* 1. AllTrails-Style 2D Topo Map Route Preview (Unboxed, directly in feed) */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#E8EDE6] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <Link
            href={`/routes/${route.id}`}
            className="block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
            aria-label={`Buka detail rute ${route.name}`}
          >
            {mapData ? (
              <svg
                viewBox="0 0 360 260"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              >
                <defs>
                  {/* Soft alpine topographic hill terrain */}
                  <linearGradient
                    id={`terrain-${route.id}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#DFE7DC" />
                    <stop offset="45%" stopColor="#E9EFE7" />
                    <stop offset="100%" stopColor="#D5DFD1" />
                  </linearGradient>

                  {/* Topographic organic contour curves */}
                  <pattern
                    id={`topo-${route.id}`}
                    width="120"
                    height="120"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 0 30 Q 30 10 60 30 T 120 30 M 0 60 Q 30 40 60 60 T 120 60 M 0 90 Q 30 70 60 90 T 120 90"
                      fill="none"
                      stroke="#CBD7C8"
                      strokeWidth="1"
                      strokeOpacity="0.45"
                    />
                    <ellipse
                      cx="60"
                      cy="60"
                      rx="35"
                      ry="22"
                      fill="none"
                      stroke="#CBD7C8"
                      strokeWidth="1"
                      strokeOpacity="0.35"
                    />
                  </pattern>
                </defs>

                {/* Base terrain */}
                <rect width="360" height="260" fill={`url(#terrain-${route.id})`} />
                <rect width="360" height="260" fill={`url(#topo-${route.id})`} />

                {/* Trail line shadow casing */}
                <path
                  d={mapData.path}
                  fill="none"
                  stroke="rgba(15, 60, 30, 0.22)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Vibrant trail route line */}
                <path
                  d={mapData.path}
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Start Point Marker (Black dot with white ring like reference) */}
                {mapData.startPoint && (
                  <circle
                    cx={mapData.startPoint.x}
                    cy={mapData.startPoint.y}
                    r="5"
                    fill="#111827"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                  />
                )}
              </svg>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#1B4332] text-xs font-semibold text-white/80">
                Peta Rute Trail
              </div>
            )}
          </Link>

          {/* Floating Share Button in Top-Right Corner */}
          <button
            type="button"
            onClick={handleShare}
            className="absolute top-3 right-3 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            title="Bagikan rute ini"
            aria-label="Bagikan rute ini"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* 2. Route Name & Date */}
        <div className="mt-3">
          <Link
            href={`/routes/${route.id}`}
            className="block text-lg sm:text-xl font-bold tracking-tight text-[#111827] transition hover:text-[#1B4332] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
          >
            <span className="line-clamp-1">{route.name}</span>
          </Link>

          {formattedDate && (
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-[#6B7280]">
              {formattedDate}
            </p>
          )}
        </div>
      </div>

      {/* 3. Stats Row & Action Buttons (Jarak | Elev. Gain | KM Effort + Download & Delete) */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-5 sm:gap-7">
          {/* Jarak */}
          <div>
            <span className="block text-[11px] sm:text-xs text-[#6B7280]">
              Jarak
            </span>
            <span className="mt-0.5 block text-xs sm:text-sm font-bold text-[#111827] tabular-nums whitespace-nowrap">
              {distanceKm} km
            </span>
          </div>

          {/* Elevasi Gain */}
          <div>
            <span className="block text-[11px] sm:text-xs text-[#6B7280]">
              Elev. Gain
            </span>
            <span className="mt-0.5 block text-xs sm:text-sm font-bold text-[#111827] tabular-nums whitespace-nowrap">
              +{elevationGainM.toLocaleString("id-ID")} m
            </span>
          </div>

          {/* KM Effort */}
          <div>
            <span className="block text-[11px] sm:text-xs text-[#6B7280]">
              KM Effort
            </span>
            <span className="mt-0.5 block text-xs sm:text-sm font-bold text-[#111827] tabular-nums whitespace-nowrap">
              {kmEffort} km
            </span>
          </div>
        </div>

        {/* Action Buttons: Circular Outline Download & Delete */}
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={`/api/routes/${route.id}/gpx`}
            download
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D1D5DB] text-[#4B5563] transition hover:border-[#1B4332] hover:bg-white hover:text-[#1B4332] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
            title="Download file GPX"
            aria-label="Download file GPX"
          >
            <ArrowDownToLine className="h-4 w-4" />
          </a>

          <button
            type="button"
            onClick={() => onDelete(route)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-red-200 text-[#B91C1C] transition hover:border-red-300 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]"
            title="Hapus rute"
            aria-label="Hapus rute"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  )
}
