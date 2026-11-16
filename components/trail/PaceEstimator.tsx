"use client"

import { useState, useMemo } from "react"
import { Timer } from "lucide-react"

import { useEntitlements } from "@/lib/entitlements"
import type { RouteStats } from "@/lib/types"

interface PaceEstimatorProps {
  stats: RouteStats
}

export function calculateFinishTime(
  distanceKm: number,
  elevationGainM: number,
  paceMin: number,
  paceSec: number,
  useKmEffort = true
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

export function PaceEstimator({ stats }: PaceEstimatorProps) {
  const { can, isLoading: authLoading } = useEntitlements()
  const hasPaceAccess = can("pace_basic")

  const [paceMin, setPaceMin] = useState<number>(7)
  const [paceSec, setPaceSec] = useState<number>(30)

  const distanceKm = stats.totalDistance / 1000
  const elevationGainM = stats.elevationGain

  const finishTime = useMemo(() => {
    return calculateFinishTime(
      distanceKm,
      elevationGainM,
      paceMin,
      paceSec,
      true
    )
  }, [distanceKm, elevationGainM, paceMin, paceSec])

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

          {/* Row 2: KM Effort Info (always active) */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <div>
              <p className="text-sm font-medium text-[#2D3436]">
                Jarak Efektif (KM-Effort)
              </p>
              <p className="text-xs text-[#4B5563]">
                Otomatis memperhitungkan +1 km tiap 100 m D+
              </p>
            </div>

            <p className="text-sm font-bold text-[#2D3436] tabular-nums">
              {(distanceKm + elevationGainM * 0.01).toFixed(1)} km effort
            </p>
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
      </div>
    </section>
  )
}
