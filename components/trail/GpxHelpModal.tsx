"use client"

import { useEffect } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { X, FileCode2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

interface GpxHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

const PROVIDERS = [
  { key: "strava", titleKey: "home.gpxHelp.stravaTitle", stepsKey: "home.gpxHelp.stravaSteps" },
  { key: "garmin", titleKey: "home.gpxHelp.garminTitle", stepsKey: "home.gpxHelp.garminSteps" },
  { key: "coros", titleKey: "home.gpxHelp.corosTitle", stepsKey: "home.gpxHelp.corosSteps" },
  { key: "suunto", titleKey: "home.gpxHelp.suuntoTitle", stepsKey: "home.gpxHelp.suuntoSteps" },
  { key: "zepp", titleKey: "home.gpxHelp.zeppTitle", stepsKey: "home.gpxHelp.zeppSteps" },
] as const

export function GpxHelpModal({ isOpen, onClose }: GpxHelpModalProps) {
  const { t } = useI18n()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!isOpen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gpx-help-title"
          aria-describedby="gpx-help-subtitle"
          className="fixed inset-0 z-3000 flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl border border-[#E5E7EB] bg-white px-5 pt-5 pb-7 shadow-xl sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1B4332]/12 text-[#1B4332]">
                  <FileCode2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="gpx-help-title" className="text-base font-bold text-[#1F2937]">
                    {t("home.gpxHelp.title")}
                  </h2>
                  <p id="gpx-help-subtitle" className="text-xs font-medium text-[#4B5563]">
                    {t("home.gpxHelp.subtitle")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={t("home.gpxHelp.closeAria")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#4B5563] transition hover:bg-[#F1EDE8] hover:text-[#1F2937] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {PROVIDERS.map((provider) => (
                <div
                  key={provider.key}
                  className="rounded-xl border border-[#E5E7EB] bg-[#FAF6F1]/70 px-3.5 py-2.5"
                >
                  <p className="text-xs font-semibold text-[#1B4332]">
                    {t(provider.titleKey)}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#4B5563]">
                    {t(provider.stepsKey)}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
