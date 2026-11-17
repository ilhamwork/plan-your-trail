"use client"

import { useState, useMemo } from "react"
import { Timer } from "lucide-react"

import { useEntitlements } from "@/lib/entitlements"
import { useI18n } from "@/lib/i18n/context"
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

export function calculateRequiredPace(
  distanceKm: number,
  elevationGainM: number,
  targetHours: number,
  targetMinutes: number,
  useKmEffort = true
): { paceMin: number; paceSec: number; totalPaceMinutes: number } {
  const effectiveDistance = useKmEffort
    ? distanceKm + elevationGainM * 0.01
    : distanceKm
  const totalTargetMinutes = Math.max(0, targetHours * 60 + targetMinutes)

  if (effectiveDistance <= 0 || totalTargetMinutes <= 0) {
    return { paceMin: 0, paceSec: 0, totalPaceMinutes: 0 }
  }

  const totalPaceMinutes = totalTargetMinutes / effectiveDistance
  const totalPaceSeconds = Math.round(totalPaceMinutes * 60)
  const paceMin = Math.floor(totalPaceSeconds / 60)
  const paceSec = totalPaceSeconds % 60

  return { paceMin, paceSec, totalPaceMinutes }
}

type EstimatorMode = "pace" | "finish_time"

export function PaceEstimator({ stats }: PaceEstimatorProps) {
  const { can, isLoading: authLoading } = useEntitlements()
  const { t } = useI18n()
  const hasPaceAccess = can("pace_basic")

  const distanceKm = stats.totalDistance / 1000
  const elevationGainM = stats.elevationGain

  const [mode, setMode] = useState<EstimatorMode>("pace")
  const [paceMin, setPaceMin] = useState<number>(7)
  const [paceSec, setPaceSec] = useState<number>(30)

  const initialFinish = useMemo(
    () => calculateFinishTime(distanceKm, elevationGainM, 7, 30, true),
    [distanceKm, elevationGainM]
  )
  const [targetHours, setTargetHours] = useState<number>(initialFinish.hours)
  const [targetMinutes, setTargetMinutes] = useState<number>(
    initialFinish.minutes
  )

  const finishTime = useMemo(() => {
    return calculateFinishTime(
      distanceKm,
      elevationGainM,
      paceMin,
      paceSec,
      true
    )
  }, [distanceKm, elevationGainM, paceMin, paceSec])

  const requiredPace = useMemo(() => {
    return calculateRequiredPace(
      distanceKm,
      elevationGainM,
      targetHours,
      targetMinutes,
      true
    )
  }, [distanceKm, elevationGainM, targetHours, targetMinutes])

  const handleModeChange = (nextMode: EstimatorMode) => {
    if (nextMode === mode) return
    if (nextMode === "finish_time") {
      setTargetHours(finishTime.hours)
      setTargetMinutes(finishTime.minutes)
    } else if (requiredPace.totalPaceMinutes > 0) {
      setPaceMin(Math.max(1, requiredPace.paceMin))
      setPaceSec(requiredPace.paceSec)
    }
    setMode(nextMode)
  }

  // Gated State for Anonymous (Flattened teaser card with Example preview)
  if (!authLoading && !hasPaceAccess) {
    return (
      <section
        aria-label={t("pace.lockedCutoffTitle")}
        className="rounded-2xl border border-[#E5E7EB] bg-white p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF6F1] text-[#1B4332]">
            <Timer className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold leading-snug tracking-tight text-[#111827]">
              {t("pace.lockedCutoffTitle")}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#4B5563]">
              {t("authWall.paceDesc")}
            </p>
          </div>
        </div>

        {/* Illustrative example preview (<= 80px) */}
        <div
          aria-hidden="true"
          className="mt-3.5 flex max-h-20 items-center justify-between gap-2 rounded-xl border border-[#E5E7EB]/80 bg-[#FAF6F1]/70 px-3.5 py-2.5"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#1B4332] tabular-nums ring-1 ring-[#E5E7EB]">
              7:30 /km
            </span>
            <span className="text-xs font-bold text-[#111827] tabular-nums">
              {t("pace.exampleDuration")}
            </span>
          </div>
          <span className="shrink-0 rounded-full bg-[#1B4332]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1B4332]">
            {t("authWall.exampleBadge")}
          </span>
        </div>
      </section>
    )
  }

  return (
    <section aria-label={t("paceCalc.title")} className="py-1">
      <div>
        <h3 className="text-xl font-bold tracking-tight text-[#111827]">
          {t("paceCalc.title")}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-[#4B5563]">
          {t("paceCalc.subtitle")}
        </p>
      </div>

      <div className="mt-3 space-y-4">
        <div
          role="tablist"
          aria-label={t("paceCalc.modeAria")}
          className="inline-flex w-full rounded-full border border-[#E5E7EB] bg-[#F3F4F6] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "pace"}
            onClick={() => handleModeChange("pace")}
            className={`min-h-8 w-full cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
              mode === "pace"
                ? "bg-[#1B4332] text-[#FAF6F1] shadow-xs"
                : "text-[#4B5563] hover:text-[#111827]"
            }`}
          >
            {t("paceCalc.tabPace")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "finish_time"}
            onClick={() => handleModeChange("finish_time")}
            className={`min-h-8 w-full cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
              mode === "finish_time"
                ? "bg-[#1B4332] text-[#FAF6F1] shadow-xs"
                : "text-[#4B5563] hover:text-[#111827]"
            }`}
          >
            {t("paceCalc.tabFinishTime")}
          </button>
        </div>

        {/* Flat single-row style telemetry controls */}
        <div className="divide-y divide-[#E5E7EB]">
          {/* Row 1: Target Pace OR Target Finish Time */}
          {mode === "pace" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="flex items-center gap-3">
                <div>
                  <label
                    htmlFor="pace-min-input"
                    className="text-sm font-medium text-[#2D3436]"
                  >
                    {t("paceCalc.avgPaceLabel")}
                  </label>
                  <p className="text-xs text-[#4B5563]">
                    {t("paceCalc.avgPaceHelper")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex min-h-11 items-center rounded-xl border border-[#D1D5DB] bg-white px-2.5">
                  <input
                    id="pace-min-input"
                    type="number"
                    min={3}
                    max={25}
                    aria-label={t("paceCalc.minAria")}
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
                    aria-label={t("paceCalc.secAria")}
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
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div>
                <label
                  htmlFor="target-hours-input"
                  className="text-sm font-medium text-[#2D3436]"
                >
                  {t("paceCalc.targetFinishLabel")}
                </label>
                <p className="text-xs text-[#4B5563]">
                  {t("paceCalc.targetFinishHelper")}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex min-h-11 items-center gap-1 rounded-xl border border-[#D1D5DB] bg-white px-2.5">
                  <input
                    id="target-hours-input"
                    type="number"
                    min={0}
                    max={99}
                    aria-label={t("paceCalc.hoursAria")}
                    value={targetHours}
                    onChange={(e) =>
                      setTargetHours(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-11 bg-transparent text-center text-sm font-bold text-[#2D3436] tabular-nums focus-visible:outline-2 focus-visible:outline-[#1B4332]"
                  />
                  <span className="text-xs font-semibold text-[#4B5563]">
                    {t("paceCalc.hoursUnit")}
                  </span>
                  <input
                    id="target-minutes-input"
                    type="number"
                    min={0}
                    max={59}
                    aria-label={t("paceCalc.minutesAria")}
                    value={targetMinutes.toString().padStart(2, "0")}
                    onChange={(e) =>
                      setTargetMinutes(
                        Math.min(59, Math.max(0, parseInt(e.target.value) || 0))
                      )
                    }
                    className="w-11 bg-transparent text-center text-sm font-bold text-[#2D3436] tabular-nums focus-visible:outline-2 focus-visible:outline-[#1B4332]"
                  />
                  <span className="text-xs font-semibold text-[#4B5563]">
                    {t("paceCalc.minutesUnit")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Row 2: KM Effort Info (always active) */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <div>
              <p className="text-sm font-medium text-[#2D3436]">
                {t("paceCalc.kmEffortLabel")}
              </p>
              <p className="text-xs text-[#4B5563]">
                {t("paceCalc.kmEffortHelper")}
              </p>
            </div>

            <p className="text-sm font-bold text-[#2D3436] tabular-nums">
              {t("paceCalc.kmEffortUnit", {
                val: (distanceKm + elevationGainM * 0.01).toFixed(1),
              })}
            </p>
          </div>

          {/* Row 3: Output */}
          {mode === "pace" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-semibold text-[#2D3436]">
                  {t("paceCalc.outputLabel")}
                </p>
                <p className="text-xs text-[#4B5563] tabular-nums">
                  {t("paceCalc.outputDetail", {
                    pace: `${paceMin}:${paceSec.toString().padStart(2, "0")}`,
                    dist: distanceKm.toFixed(1),
                    gain: elevationGainM,
                  })}
                </p>
              </div>

              <p className="text-xl font-extrabold tracking-tight text-[#1B4332] tabular-nums sm:text-2xl">
                {finishTime.hours > 0 &&
                  `${finishTime.hours} ${t("paceCalc.hoursUnit")} `}
                {finishTime.minutes} {t("paceCalc.minutesUnit")}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-semibold text-[#2D3436]">
                  {t("paceCalc.outputPaceLabel")}
                </p>
                <p className="text-xs text-[#4B5563] tabular-nums">
                  {t("paceCalc.outputPaceDetail", {
                    time: `${targetHours > 0 ? `${targetHours} ${t("paceCalc.hoursUnit")} ` : ""}${targetMinutes} ${t("paceCalc.minutesUnit")}`,
                    dist: distanceKm.toFixed(1),
                    gain: elevationGainM,
                  })}
                </p>
              </div>

              <p className="text-xl font-extrabold tracking-tight text-[#1B4332] tabular-nums sm:text-2xl">
                {requiredPace.paceMin}:
                {requiredPace.paceSec.toString().padStart(2, "0")} /km
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
