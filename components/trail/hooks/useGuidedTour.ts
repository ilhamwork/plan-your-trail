"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  getTourSteps,
  type TourAudience,
  type TourPhase,
  type TourStep,
} from "@/lib/tour/steps"
import {
  readTourCompletion,
  markTourPhaseCompleted,
  shouldAutoStartTour,
} from "@/lib/tour/storage"
import {
  getRegisteredTourStatusAction,
  completeRegisteredTourPhaseAction,
} from "@/app/actions/tour"
import type { RegisteredTourStatus } from "@/lib/db/queries/profiles"

export const START_TOUR_EVENT = "pyt:start-tour"

export function dispatchStartTourEvent(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(START_TOUR_EVENT))
}

interface UseGuidedTourOptions {
  audience: TourAudience
  phase: TourPhase
  enabled: boolean
}

export interface UseGuidedTourReturn {
  isOpen: boolean
  stepIndex: number
  steps: TourStep[]
  currentStep: TourStep | null
  audience: TourAudience
  phase: TourPhase
  startTour: () => void
  nextStep: () => void
  prevStep: () => void
  closeTour: () => void
}

export function useGuidedTour({
  audience,
  phase,
  enabled,
}: UseGuidedTourOptions): UseGuidedTourReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [remoteStatus, setRemoteStatus] = useState<RegisteredTourStatus | null>(
    null
  )
  const [prevAudience, setPrevAudience] = useState<TourAudience>(audience)
  const fetchingRemoteRef = useRef(false)

  if (audience !== prevAudience) {
    setPrevAudience(audience)
    if (audience !== "registered" && remoteStatus !== null) {
      setRemoteStatus(null)
    }
  }

  const steps = useMemo(() => getTourSteps(audience, phase), [audience, phase])

  // Sync registered user tour completion from DB so it persists across devices
  useEffect(() => {
    if (audience !== "registered") {
      fetchingRemoteRef.current = false
      return
    }
    if (remoteStatus !== null || fetchingRemoteRef.current) return

    let cancelled = false
    fetchingRemoteRef.current = true

    getRegisteredTourStatusAction()
      .then((res) => {
        if (cancelled) return
        if (res.ok) {
          if (res.data.empty) markTourPhaseCompleted("registered", "empty")
          if (res.data.analysis) markTourPhaseCompleted("registered", "analysis")
          setRemoteStatus(res.data)
        } else {
          setRemoteStatus({ empty: false, analysis: false })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteStatus({ empty: false, analysis: false })
        }
      })
      .finally(() => {
        fetchingRemoteRef.current = false
      })

    return () => {
      cancelled = true
    }
  }, [audience, remoteStatus])

  const persistCompletion = useCallback(
    (targetAudience: TourAudience, targetPhase: TourPhase) => {
      markTourPhaseCompleted(targetAudience, targetPhase)
      if (targetAudience === "registered") {
        setRemoteStatus((prev) => ({
          empty: targetPhase === "empty" ? true : (prev?.empty ?? false),
          analysis:
            targetPhase === "analysis" ? true : (prev?.analysis ?? false),
        }))
        void completeRegisteredTourPhaseAction(targetPhase)
      }
    },
    []
  )

  // Auto-start tour on first visit for the current (audience, phase)
  useEffect(() => {
    if (!enabled) return
    if (audience === "registered" && remoteStatus === null) return

    const completion = readTourCompletion()
    const isCompletedRemotely =
      audience === "registered" && Boolean(remoteStatus?.[phase])
    if (isCompletedRemotely || !shouldAutoStartTour(completion, audience, phase)) {
      return
    }

    const timer = window.setTimeout(() => {
      setStepIndex(0)
      setIsOpen(true)
    }, 450)

    return () => window.clearTimeout(timer)
  }, [audience, phase, enabled, remoteStatus])

  const startTour = useCallback(() => {
    setStepIndex(0)
    setIsOpen(true)
  }, [])

  // Listen for manual trigger from Header button
  useEffect(() => {
    const handleStart = () => {
      if (!enabled) return
      startTour()
    }
    window.addEventListener(START_TOUR_EVENT, handleStart)
    return () => window.removeEventListener(START_TOUR_EVENT, handleStart)
  }, [enabled, startTour])

  const closeTour = useCallback(() => {
    persistCompletion(audience, phase)
    setIsOpen(false)
    setStepIndex(0)
  }, [audience, phase, persistCompletion])

  const nextStep = useCallback(() => {
    setStepIndex((prev) => {
      if (prev + 1 >= steps.length) {
        persistCompletion(audience, phase)
        setIsOpen(false)
        return 0
      }
      return prev + 1
    })
  }, [steps.length, audience, phase, persistCompletion])

  const prevStep = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const currentStep = isOpen ? (steps[stepIndex] ?? null) : null

  return {
    isOpen,
    stepIndex,
    steps,
    currentStep,
    audience,
    phase,
    startTour,
    nextStep,
    prevStep,
    closeTour,
  }
}
