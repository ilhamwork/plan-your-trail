"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Sparkles, Compass } from "lucide-react"
import type { TourAudience, TourStep } from "@/lib/tour/steps"
import { useI18n } from "@/lib/i18n/context"

interface GuidedTourProps {
  isOpen: boolean
  audience: TourAudience
  stepIndex: number
  totalSteps: number
  currentStep: TourStep | null
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

const SPOTLIGHT_PADDING = 8
const VIEWPORT_MARGIN = 16
const CARD_MAX_WIDTH = 360

function findVisibleTarget(selector: string): HTMLElement | null {
  if (typeof document === "undefined") return null
  const candidates = document.querySelectorAll<HTMLElement>(selector)
  for (const el of candidates) {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      return el
    }
  }
  return null
}

export function GuidedTour({
  isOpen,
  audience,
  stepIndex,
  totalSteps,
  currentStep,
  onNext,
  onPrev,
  onClose,
}: GuidedTourProps) {
  const { t } = useI18n()
  const prefersReducedMotion = useReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null)
  const [popoverPos, setPopoverPos] = useState<{
    top: number
    left: number
    width: number
  }>({
    top: 100,
    left: 16,
    width: CARD_MAX_WIDTH,
  })

  const measureAndPosition = useCallback(() => {
    if (!isOpen || !currentStep) return

    const vw = window.innerWidth
    const vh = window.innerHeight
    const cardWidth = Math.min(CARD_MAX_WIDTH, vw - VIEWPORT_MARGIN * 2)
    const cardHeight = cardRef.current?.offsetHeight ?? 220

    const el = findVisibleTarget(currentStep.targetSelector)
    if (!el) {
      setTargetRect(null)
      setPopoverPos({
        top: Math.max(VIEWPORT_MARGIN, (vh - cardHeight) / 2),
        left: Math.max(VIEWPORT_MARGIN, (vw - cardWidth) / 2),
        width: cardWidth,
      })
      return
    }

    const raw = el.getBoundingClientRect()
    const padded: SpotlightRect = {
      top: Math.max(0, raw.top - SPOTLIGHT_PADDING),
      left: Math.max(0, raw.left - SPOTLIGHT_PADDING),
      width: Math.min(vw, raw.width + SPOTLIGHT_PADDING * 2),
      height: Math.min(vh, raw.height + SPOTLIGHT_PADDING * 2),
    }
    setTargetRect(padded)

    const gap = 14
    const spaceBelow = vh - (raw.bottom + SPOTLIGHT_PADDING) - VIEWPORT_MARGIN
    const spaceAbove = raw.top - SPOTLIGHT_PADDING - VIEWPORT_MARGIN

    let top: number
    const preferBottom = currentStep.placement !== "top"

    if (preferBottom && spaceBelow >= cardHeight + gap) {
      top = raw.bottom + SPOTLIGHT_PADDING + gap
    } else if (!preferBottom && spaceAbove >= cardHeight + gap) {
      top = raw.top - SPOTLIGHT_PADDING - gap - cardHeight
    } else if (spaceBelow >= cardHeight + gap) {
      top = raw.bottom + SPOTLIGHT_PADDING + gap
    } else if (spaceAbove >= cardHeight + gap) {
      top = raw.top - SPOTLIGHT_PADDING - gap - cardHeight
    } else {
      // Target is tall (e.g., map-view) — anchor cleanly near bottom of viewport
      top = Math.max(VIEWPORT_MARGIN, vh - cardHeight - VIEWPORT_MARGIN)
    }

    const centeredLeft = raw.left + raw.width / 2 - cardWidth / 2
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, centeredLeft),
      vw - cardWidth - VIEWPORT_MARGIN
    )

    setPopoverPos({
      top: Math.min(Math.max(VIEWPORT_MARGIN, top), vh - cardHeight - VIEWPORT_MARGIN),
      left,
      width: cardWidth,
    })
  }, [isOpen, currentStep])

  // Scroll target into view when step changes
  useEffect(() => {
    if (!isOpen || !currentStep) return

    const el = findVisibleTarget(currentStep.targetSelector)
    if (el) {
      const rect = el.getBoundingClientRect()
      const isFullyVisible =
        rect.top >= 72 && rect.bottom <= window.innerHeight - 24
      if (!isFullyVisible) {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "center",
        })
      }
    }

    const frame = window.requestAnimationFrame(() => measureAndPosition())
    const settleTimer = window.setTimeout(() => measureAndPosition(), 320)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
    }
  }, [isOpen, currentStep, prefersReducedMotion, measureAndPosition])

  // Keep aligned on scroll/resize
  useEffect(() => {
    if (!isOpen) return
    let rafId = 0
    const handleUpdate = () => {
      window.cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(() => measureAndPosition())
    }
    window.addEventListener("resize", handleUpdate)
    window.addEventListener("scroll", handleUpdate, true)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener("resize", handleUpdate)
      window.removeEventListener("scroll", handleUpdate, true)
    }
  }, [isOpen, measureAndPosition])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        onNext()
      } else if (e.key === "ArrowLeft" && stepIndex > 0) {
        e.preventDefault()
        onPrev()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, stepIndex, onClose, onNext, onPrev])

  const isLastStep = stepIndex + 1 >= totalSteps
  const badgeLabel =
    audience === "guest" ? t("tour.badgeGuest") : t("tour.badgeRegistered")

  return (
    <AnimatePresence>
      {isOpen && currentStep && (
        <>
          {/* Backdrop (blocks outside clicks; close only via X, Skip, or Escape) */}
          <motion.div
            key="tour-backdrop"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-[1100]"
            aria-hidden="true"
            style={{
              backgroundColor: targetRect ? "transparent" : "rgba(15, 23, 42, 0.58)",
            }}
          />

          {/* Spotlight cutout */}
          {targetRect && (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed z-[1100] rounded-2xl ring-2 ring-emerald-400/90 transition-all duration-300"
              style={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height,
                boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.58)",
              }}
            />
          )}

          {/* Floating Popover Card */}
          <motion.div
            ref={cardRef}
            key={currentStep.id}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guided-tour-title"
            aria-describedby="guided-tour-desc"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="fixed z-[1101] rounded-2xl border border-[#1B4332]/15 bg-[#FAF6F1] p-5 shadow-2xl"
            style={{
              top: popoverPos.top,
              left: popoverPos.left,
              width: popoverPos.width,
            }}
          >
            {/* Header row: badge + close */}
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1B4332]/10 px-2.5 py-1 text-[11px] font-semibold text-[#1B4332]">
                {audience === "guest" ? (
                  <Compass className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                )}
                <span>{badgeLabel}</span>
              </span>

              <button
                type="button"
                onClick={onClose}
                aria-label={t("tour.closeAria")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#4B5563] transition hover:bg-black/5 hover:text-[#111827] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <h3
              id="guided-tour-title"
              className="text-base font-bold tracking-tight text-[#111827]"
            >
              {t(currentStep.titleKey)}
            </h3>
            <p
              id="guided-tour-desc"
              className="mt-1.5 text-sm leading-relaxed text-[#4B5563]"
            >
              {t(currentStep.descriptionKey)}
            </p>

            {/* Step progress bar */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#6B7280]">
                {t("tour.stepCounter", {
                  current: stepIndex + 1,
                  total: totalSteps,
                })}
              </span>
              <div className="flex items-center gap-1" aria-hidden="true">
                {Array.from({ length: totalSteps }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === stepIndex
                        ? "w-4 bg-[#1B4332]"
                        : idx < stepIndex
                          ? "w-1.5 bg-[#1B4332]/45"
                          : "w-1.5 bg-[#D1D5DB]"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Footer actions */}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#E5E7EB] pt-3.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-9 rounded-lg px-2.5 text-xs font-medium text-[#6B7280] transition hover:bg-black/5 hover:text-[#111827]"
              >
                {t("tour.skip")}
              </button>

              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <button
                    type="button"
                    onClick={onPrev}
                    className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t("tour.prev")}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#143326] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
                >
                  <span>{isLastStep ? t("tour.finish") : t("tour.next")}</span>
                  {!isLastStep && (
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
