"use client"

import { useState, useMemo } from "react"
import { Timer } from "lucide-react"

import { useEntitlements } from "@/lib/entitlements"
import type { RouteStats, Waypoint } from "@/lib/types"
import { ComingSoonLock } from "./ComingSoonLock"

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

  // Gated State for Anonymous (Clean AllTrails-style card)
  if (!authLoading && !hasPaceAccess) {
    return (
      <section
        aria-label="Estimasi Waktu Finish Rute"
        className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FAF6F1] text-[#1B4332]">
            <Timer className="h-4 w-4" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-[#111827]">
            Hitung Estimasi Finish Race
          </h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">
          Kalkulasi perkiraan waktu tempuh rute ini berdasarkan target pace
          rata-rata dan tambahan jarak efektif dari elevasi menanjak (KM-Effort).
        </p>
      </section>
    )
  }

  return (
    <section aria-label="Estimasi Waktu Finish" className="py-1">
      <div>
        <h3 className="text-xl font-bold tracking-tight text-[#111827]">
          Estimasi Waktu Finish
        </h3>
        <p className="mt-0.5 text-xs text-[#6B7280]">
          Kalkulasi estimasi total waktu tempuh berdasarkan target pace rata-rata
        </p>
      </div>

      <div className="mt-3 space-y-4">
        {/* Flat single-row style telemetry controls */}
        <div className="divide-y divide-[#E5E7EB]">
          {/* Row 1: Target Pace */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5 shrink-0 text-[#2D3436]" />
              <div>
                <label
                  htmlFor="pace-min-input"
                  className="text-sm font-medium text-[#2D3436]"
                >
                  Target Pace Rata-Rata
                </label>
                <p className="text-xs text-[#4B5563]">Menit dan detik per kilometer</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex min-h-11 items-center rounded-xl border border-[#D1D5DB] bg-white px-2.5">
                <input
                  id="pace-min-input"
                  type="number"
                  min={3}
                  max={25}
                  aria-label="Menit per kilometer"
                  value={paceMin}
                  onChange={(e) =>
                    setPaceMin(Math.max(1, parseInt(e.target.value) || 0))
                  }
                  className="w-11 bg-transparent text-center text-sm font-bold text-[#2D3436] tabular-nums focus-visible:outline-2 focus-visible:outline-[#1B4332]"
                />
                <span className="text-xs font-bold text-[#4B5563]">:</span>
                <input
                  id="pace-sec-input"
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  aria-label="Detik per kilometer"
                  value={paceSec.toString().padStart(2, "0")}
                  onChange={(e) =>
                    setPaceSec(
                      Math.min(59, Math.max(0, parseInt(e.target.value) || 0))
                    )
                  }
                  className="w-11 bg-transparent text-center text-sm font-bold text-[#2D3436] tabular-nums focus-visible:outline-2 focus-visible:outline-[#1B4332]"
                />
              </div>
              <span className="text-xs font-semibold text-[#4B5563]">/km</span>
            </div>
          </div>

          {/* Row 2: KM Effort Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <div>
              <p className="text-sm font-medium text-[#2D3436]">
                Perhitungkan KM-Effort (+1 km tiap 100 m D+)
              </p>
              <p className="text-xs text-[#4B5563] tabular-nums">
                Jarak efektif:{" "}
                {useKmEffort
                  ? `${(distanceKm + elevationGainM * 0.01).toFixed(1)} km effort`
                  : `${distanceKm.toFixed(1)} km datar`}
              </p>
            </div>

            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 px-1 text-xs font-semibold text-[#2D3436]">
              <input
                type="checkbox"
                checked={useKmEffort}
                onChange={(e) => setUseKmEffort(e.target.checked)}
                className="h-5 w-5 rounded border-[#D1D5DB] text-[#1B4332] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              />
              <span>Aktif</span>
            </label>
          </div>

          {/* Row 3: Finish Time Output */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="text-sm font-semibold text-[#2D3436]">
                Estimasi Total Waktu Finish
              </p>
              <p className="text-xs text-[#4B5563] tabular-nums">
                Pace {paceMin}:{paceSec.toString().padStart(2, "0")} /km · Rute{" "}
                {distanceKm.toFixed(1)} km (+{elevationGainM} m D+)
              </p>
            </div>

            <p className="text-xl font-extrabold tracking-tight text-[#1B4332] tabular-nums sm:text-2xl">
              {finishTime.hours > 0 && `${finishTime.hours} jam `}
              {finishTime.minutes} menit
            </p>
          </div>
        </div>

        {/* Pro Checkpoint Cutoff Table Teaser (PRD 6.1) */}
        <div className="border-t border-[#E5E7EB] pt-4">
          <ComingSoonLock
            feature="cutoff_estimator"
            title="Cutoff Estimator per Checkpoint"
            source="pace_estimator"
            variant="inline"
            className="border-0 bg-transparent p-0"
          />

          <div className="mt-3 overflow-x-auto border-t border-[#E5E7EB]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5E7EB] text-[11px] font-bold text-[#4B5563]">
                <tr>
                  <th className="py-2.5 pr-3">Pos / Checkpoint</th>
                  <th className="px-3 py-2.5">Jarak</th>
                  <th className="px-3 py-2.5">Estimasi Tiba</th>
                  <th className="py-2.5 pl-3">Batas Cutoff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#4B5563] tabular-nums">
                {waypoints.slice(0, 3).map((wp, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-3 font-medium text-[#2D3436]">
                      {wp.name}
                    </td>
                    <td className="px-3 py-2.5">
                      {(wp.distance / 1000).toFixed(1)} km
                    </td>
                    <td className="px-3 py-2.5">[Segera Hadir]</td>
                    <td className="py-2.5 pl-3">[Segera Hadir]</td>
                  </tr>
                ))}
                {waypoints.length === 0 && (
                  <tr>
                    <td className="py-2.5 pr-3 font-medium text-[#2D3436]">
                      [Contoh Pos]
                    </td>
                    <td className="px-3 py-2.5">12.5 km</td>
                    <td className="px-3 py-2.5">[Segera Hadir]</td>
                    <td className="py-2.5 pl-3">[Segera Hadir]</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
