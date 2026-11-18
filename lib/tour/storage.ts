import type { TourAudience, TourPhase } from "./steps"

export const TOUR_STORAGE_KEY = "pyt_guided_tour_v1"

export interface TourCompletionState {
  guest: { empty: boolean; analysis: boolean }
  registered: { empty: boolean; analysis: boolean }
}

const DEFAULT_STATE: TourCompletionState = {
  guest: { empty: false, analysis: false },
  registered: { empty: false, analysis: false },
}

function cloneDefaultState(): TourCompletionState {
  return {
    guest: { ...DEFAULT_STATE.guest },
    registered: { ...DEFAULT_STATE.registered },
  }
}

export function readTourCompletion(): TourCompletionState {
  if (typeof window === "undefined") {
    return cloneDefaultState()
  }
  try {
    const raw = window.localStorage.getItem(TOUR_STORAGE_KEY)
    if (!raw) return cloneDefaultState()
    const parsed = JSON.parse(raw) as Partial<TourCompletionState>
    return {
      guest: {
        empty: Boolean(parsed?.guest?.empty),
        analysis: Boolean(parsed?.guest?.analysis),
      },
      registered: {
        empty: Boolean(parsed?.registered?.empty),
        analysis: Boolean(parsed?.registered?.analysis),
      },
    }
  } catch {
    return cloneDefaultState()
  }
}

function writeTourCompletion(state: TourCompletionState): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function markTourPhaseCompleted(
  audience: TourAudience,
  phase: TourPhase
): TourCompletionState {
  const current = readTourCompletion()
  const next: TourCompletionState = {
    guest: { ...current.guest },
    registered: { ...current.registered },
  }
  next[audience][phase] = true
  writeTourCompletion(next)
  return next
}

export function resetTourCompletion(
  audience?: TourAudience
): TourCompletionState {
  const current = readTourCompletion()
  const next: TourCompletionState = audience
    ? {
        guest:
          audience === "guest"
            ? { empty: false, analysis: false }
            : { ...current.guest },
        registered:
          audience === "registered"
            ? { empty: false, analysis: false }
            : { ...current.registered },
      }
    : cloneDefaultState()
  writeTourCompletion(next)
  return next
}

export function shouldAutoStartTour(
  state: TourCompletionState,
  audience: TourAudience,
  phase: TourPhase
): boolean {
  return !state[audience][phase]
}
