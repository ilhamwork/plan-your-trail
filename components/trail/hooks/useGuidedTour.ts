"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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

  const steps = useMemo(() => getTourSteps(audience, phase), [audience, phase])

  // Auto-start tour on first visit for the current (audience, phase)
  useEffect(() => {
    if (!enabled) return
    const completion = readTourCompletion()
    if (!shouldAutoStartTour(completion, audience, phase)) return

    const timer = window.setTimeout(() => {
      setStepIndex(0)
      setIsOpen(true)
    }, 450)

    return () => window.clearTimeout(timer)
  }, [audience, phase, enabled])

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
    markTourPhaseCompleted(audience, phase)
    setIsOpen(false)
    setStepIndex(0)
  }, [audience, phase])

  const nextStep = useCallback(() => {
    setStepIndex((prev) => {
      if (prev + 1 >= steps.length) {
        markTourPhaseCompleted(audience, phase)
        setIsOpen(false)
        return 0
      }
      return prev + 1
    })
  }, [steps.length, audience, phase])

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
