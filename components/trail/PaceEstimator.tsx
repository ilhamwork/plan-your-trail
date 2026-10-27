"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Timer, Lock, Sparkles, Check, ArrowRight } from "lucide-react"

import { useEntitlements } from "@/lib/entitlements"
import { trackEvent } from "@/lib/analytics/events"
import type { RouteStats, Waypoint } from "@/lib/types"

interface PaceEstimatorProps {
  stats: RouteStats
  waypoints?: Waypoint[]
}

export function calculateFinishTime(
  distanceKm: number,
  elevationGainM: number,
  paceMin: number,
  paceSec: number,
  useKmEffort: boolean
): { hours: number; minutes: number; totalMinutes: number } {
  const paceDecimal = paceMin + paceSec / 60
  const effectiveDistance = useKmEffort
    ? distanceKm + elevationGainM * 0.01
    : distanceKm

  const totalMinutes = Math.round(effectiveDistance * paceDecimal)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return { hours, minutes, totalMinutes }
}

export function PaceEstimator({ stats, waypoints = [] }: PaceEstimatorProps) {
  const { can, isLoading: authLoading } = useEntitlements()
  const hasPaceAccess = can("pace_basic")

  const [paceMin, setPaceMin] = useState<number>(7)
  const [paceSec, setPaceSec] = useState<number>(30)
  const [useKmEffort, setUseKmEffort] = useState<boolean>(true)
  const [waitlistJoined, setWaitlistJoined] = useState(false)

  const distanceKm = stats.totalDistance / 1000
  const elevationGainM = stats.elevationGain

  const finishTime = useMemo(() => {
    return calculateFinishTime(
      distanceKm,
      elevationGainM,
      paceMin,
      paceSec,
      useKmEffort
    )
  }, [distanceKm, elevationGainM, paceMin, paceSec, useKmEffort])

  const handleJoinWaitlist = () => {
    trackEvent("waitlist_joined", {
      feature: "cutoff_estimator",
      source: "pace_estimator",
    })
    setWaitlistJoined(true)
  }

  // Gated State for Anonymous
  if (!authLoading && !hasPaceAccess) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-[#2A9D8F]" />
            <h3 className="text-sm font-bold text-[#2D3436]">
              Estimasi Waktu Finish Rute
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            <Lock className="h-2.5 w-2.5" />
            Khusus Akun Terdaftar
          </span>
        </div>

        <div className="relative p-6 text-center">
          {/* Blurred Background Mockup */}
          <div className="pointer-events-none select-none blur-xs opacity-40 filter">
            <div className="flex justify-center gap-4">
              <div className="h-10 w-24 rounded-lg bg-gray-100" />
              <div className="h-10 w-32 rounded-lg bg-gray-100" />
            </div>
            <div className="mt-4 text-2xl font-bold text-gray-700">
              4 jam 25 menit
            </div>
          </div>

          {/* Overlay CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 p-4 backdrop-blur-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1B4332]/10 text-[#1B4332]">
              <Lock className="h-4 w-4" />
            </div>
            <h4 className="mt-2 text-sm font-bold text-gray-900">
              Hitung Estimasi Finish Race
            </h4>
            <p className="mt-1 max-w-sm text-xs text-gray-600">
              Daftar untuk menghitung estimasi waktu finish rute
              berdasarkan target pace dan km effort elevasi.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href="/register"
                onClick={() =>
                  trackEvent("register_clicked", {
                    source: "pace_estimator",
                    feature: "pace_basic",
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#143326]"
              >
                <span>Daftar</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-[#2A9D8F]" />
          <h3 className="text-sm font-bold text-[#2D3436]">
            Estimasi Waktu Finish
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          Kalkulasi estimasi total waktu tempuh berdasarkan target pace rata-rata
        </p>
      </div>

      <div className="p-4">
        {/* Pace Input Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Target Pace Rata-Rata
            </label>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
                <input
                  type="number"
                  min={3}
                  max={25}
                  value={paceMin}
                  onChange={(e) => setPaceMin(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-10 bg-transparent text-center text-sm font-bold text-[#2D3436] outline-none"
                />
                <span className="text-xs font-semibold text-gray-400">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  value={paceSec.toString().padStart(2, "0")}
                  onChange={(e) =>
                    setPaceSec(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))
                  }
                  className="w-10 bg-transparent text-center text-sm font-bold text-[#2D3436] outline-none"
                />
              </div>
              <span className="text-xs font-medium text-gray-500">/km</span>
            </div>
          </div>

          {/* Toggle Km Effort */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={useKmEffort}
                onChange={(e) => setUseKmEffort(e.target.checked)}
                className="h-4 w-4 rounded-sm border-gray-300 text-[#1B4332] focus:ring-[#1B4332]"
              />
              <span>Perhitungkan Km Effort (+1 km tiap 100m elevasi)</span>
            </label>
            <p className="mt-0.5 text-[11px] text-gray-400">
              Jarak efektif:{" "}
              {useKmEffort
                ? `${(distanceKm + elevationGainM * 0.01).toFixed(1)} km effort`
                : `${distanceKm.toFixed(1)} km flat`}
            </p>
          </div>
        </div>

        {/* Result Banner */}
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-center">
          <span className="text-xs font-medium text-emerald-800">
            Estimasi Total Waktu Finish
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#1B4332]">
            {finishTime.hours > 0 && `${finishTime.hours} jam `}
            {finishTime.minutes} menit
          </div>
          <p className="mt-1 text-[11px] text-emerald-700">
            Pada pace {paceMin}:{paceSec.toString().padStart(2, "0")} /km untuk rute {distanceKm.toFixed(1)} km (+{elevationGainM}m EG)
          </p>
        </div>

        {/* Pro Checkpoint Cutoff Table Teaser (PRD 6.1) */}
        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/50 p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-gray-800">
                Cutoff Estimator per Checkpoint
              </span>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                Segera Hadir di Pro
              </span>
            </div>
            {waitlistJoined ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <Check className="h-3 w-3" />
                Masuk Waitlist
              </span>
            ) : (
              <button
                type="button"
                onClick={handleJoinWaitlist}
                className="text-xs font-medium text-[#1B4332] underline hover:text-[#143326]"
              >
                Daftar Early Access
              </button>
            )}
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200/60 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase">
                <tr>
                  <th className="px-3 py-2">Pos / Checkpoint</th>
                  <th className="px-3 py-2">Jarak</th>
                  <th className="px-3 py-2">Estimasi Tiba</th>
                  <th className="px-3 py-2">Batas Cutoff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-500">
                {waypoints.slice(0, 3).map((wp, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-medium text-gray-800">{wp.name}</td>
                    <td className="px-3 py-2">{(wp.distance / 1000).toFixed(1)} km</td>
                    <td className="px-3 py-2 text-gray-400">—</td>
                    <td className="px-3 py-2 text-gray-400">—</td>
                  </tr>
                ))}
                {waypoints.length === 0 && (
                  <tr>
                    <td className="px-3 py-2 text-gray-800 font-medium">Contoh Pos 1</td>
                    <td className="px-3 py-2">12.5 km</td>
                    <td className="px-3 py-2 text-gray-400">—</td>
                    <td className="px-3 py-2 text-gray-400">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
