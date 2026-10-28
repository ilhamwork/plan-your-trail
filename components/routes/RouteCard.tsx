"use client"

import Link from "next/link"
import { Calendar, Download, Trash2, ArrowUpRight, TrendingUp, Navigation } from "lucide-react"
import type { Route } from "@/lib/db/schema"

interface RouteCardProps {
  route: Route
  onDelete: (route: Route) => void
}

export function RouteCard({ route, onDelete }: RouteCardProps) {
  const metrics = route.metrics as {
    stats?: {
      totalDistance?: number
      elevationGain?: number
      elevationLoss?: number
    }
    raceDate?: string
    runnerName?: string
  }

  const distanceKm = metrics?.stats?.totalDistance
    ? (metrics.stats.totalDistance / 1000).toFixed(1)
    : "—"

  const elevationGainM = metrics?.stats?.elevationGain
    ? Math.round(metrics.stats.elevationGain)
    : "—"

  const formattedDate = route.createdAt
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(route.createdAt))
    : ""

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs transition hover:border-[#1B4332]/30 hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="line-clamp-1 font-bold text-gray-900" title={route.name}>
              {route.name}
            </h3>
            {metrics?.raceDate && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>Tanggal Race: {metrics.raceDate}</span>
              </div>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            Tersimpan
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-50/80 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-[#1B4332]">
              <Navigation className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-gray-500">Jarak</div>
              <div className="text-sm font-bold text-gray-900">{distanceKm} km</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-gray-500">Elev. Gain</div>
              <div className="text-sm font-bold text-gray-900">+{elevationGainM} m</div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-gray-400">
          Disimpan pada {formattedDate}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-1">
          <a
            href={`/api/routes/${route.id}/gpx`}
            download
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            title="Download file GPX asli"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </a>

          <button
            type="button"
            onClick={() => onDelete(route)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
            title="Hapus rute"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Hapus</span>
          </button>
        </div>

        <Link
          href={`/routes/${route.id}`}
          className="flex items-center gap-1 rounded-lg bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#2D5A46]"
        >
          <span>Buka Analisis</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
