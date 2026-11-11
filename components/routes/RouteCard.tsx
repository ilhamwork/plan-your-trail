"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Calendar, Download, Trash2, ArrowUpRight } from "lucide-react"
import type { Route } from "@/lib/db/schema"
import type { TrackPoint } from "@/lib/types"
import { useI18n } from "@/lib/i18n/context"

interface RouteCardProps {
  route: Route
  onDelete: (route: Route) => void
}

export function RouteCard({ route, onDelete }: RouteCardProps) {
  const { t } = useI18n()
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

  const distanceKm = metrics?.stats?.totalDistance
    ? (metrics.stats.totalDistance / 1000).toFixed(1)
    : "0"

  const elevationGainM = metrics?.stats?.elevationGain
    ? Math.round(metrics.stats.elevationGain)
    : 0

  const formattedDate = route.createdAt
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(route.createdAt))
    : ""

  // Build real SVG elevation silhouette from route.trackSimplified
  const elevationPath = useMemo(() => {
    const pts = (route.trackSimplified as TrackPoint[] | null) || []
    if (pts.length < 2) return null

    const step = Math.max(1, Math.floor(pts.length / 48))
    const sampled = pts.filter((_, idx) => idx % step === 0 || idx === pts.length - 1)
    const elevations = sampled.map((p) => p.ele ?? 0)
    const minEle = Math.min(...elevations)
    const maxEle = Math.max(...elevations)
    const span = Math.max(maxEle - minEle, 10)

    const width = 320
    const height = 96
    const padTop = 18
    const padBottom = 10
    const usableH = height - padTop - padBottom

    const coords = sampled.map((p, idx) => {
      const x = (idx / Math.max(sampled.length - 1, 1)) * width
      const norm = ((p.ele ?? minEle) - minEle) / span
      const y = padTop + usableH * (1 - norm)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })

    const line = `M ${coords.join(" L ")}`
    const area = `${line} L ${width},${height} L 0,${height} Z`
    return { line, area }
  }, [route.trackSimplified])

  return (
    <article className="group flex flex-col justify-between rounded-3xl border border-[#E5E7EB] bg-white p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition hover:border-[#1B4332]/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div>
        {/* Airbnb-style Visual Thumbnail Header with Real Elevation Profile */}
        <Link
          href={`/routes/${route.id}`}
          className="relative block h-40 w-full overflow-hidden rounded-2xl bg-[#1B4332] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
        >
          {/* Top-left Airbnb-style Pill Badge */}
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#2D3436] shadow-xs">
              {t("common.saved")}
            </span>
          </div>

          {/* Top-right Distance + Gain Pill */}
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center rounded-full bg-black/30 px-2.5 py-1 text-xs font-semibold text-[#FAF6F1] backdrop-blur-xs">
              {distanceKm} km
            </span>
          </div>

          {/* Elevation Profile Silhouette */}
          {elevationPath ? (
            <svg
              viewBox="0 0 320 96"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-28 w-full"
            >
              <path d={elevationPath.area} fill="rgba(250, 246, 241, 0.14)" />
              <path
                d={elevationPath.line}
                fill="none"
                stroke="#FAF6F1"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <div className="absolute inset-x-0 bottom-4 text-center text-xs font-medium text-[#FAF6F1]/75">
              GPX Trail Route
            </div>
          )}
        </Link>

        {/* Airbnb-style Clean Metadata Block */}
        <div className="mt-3.5 px-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/routes/${route.id}`}
              className="heading-3 line-clamp-1 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              title={route.name}
            >
              {route.name}
            </Link>
          </div>

          <p className="mt-1 body-medium text-[#4B5563]">
            <span>
              {t("routes.cardDistance")} {distanceKm} km
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>
              {t("routes.cardGain")} +{elevationGainM} m
            </span>
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 body-sm">
            {metrics?.raceDate ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-[#1B4332]" />
                <span>Race: {metrics.raceDate}</span>
              </span>
            ) : (
              <span>
                {t("routes.cardCreated")} {formattedDate}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer with >= 44px Touch Targets */}
      <div className="mt-4 flex items-center justify-between border-t border-[#E5E7EB] pt-3">
        <div className="flex items-center gap-1">
          <a
            href={`/api/routes/${route.id}/gpx`}
            download
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-[#2D3436] transition hover:bg-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
            title="Download file GPX"
          >
            <Download className="h-4 w-4 text-[#1B4332]" />
            <span>{t("common.download")}</span>
          </a>

          <button
            type="button"
            onClick={() => onDelete(route)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-[#B91C1C] transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]"
            title="Hapus rute"
          >
            <Trash2 className="h-4 w-4" />
            <span>{t("common.delete")}</span>
          </button>
        </div>

        <Link
          href={`/routes/${route.id}`}
          className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[#1B4332] px-4 text-xs font-semibold text-[#FAF6F1] shadow-2xs transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
        >
          <span>Buka Analisis</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}
