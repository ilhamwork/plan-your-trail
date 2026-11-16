"use client"

import { motion, useReducedMotion } from "framer-motion"
import {
  Map,
  BarChart3,
  Waypoints,
  CloudSun,
  Lock,
} from "lucide-react"
import { UploadCard } from "./UploadCard"
import { Footer } from "./Footer"
import { useI18n } from "@/lib/i18n/context"

const FEATURES = [
  {
    icon: Map,
    titleKey: "home.features.routeMapTitle",
    descKey: "home.features.routeMapDesc",
    color: "text-[#1E7A6E]",
    bg: "bg-[#2A9D8F]/16",
  },
  {
    icon: BarChart3,
    titleKey: "home.features.elevationTitle",
    descKey: "home.features.elevationDesc",
    color: "text-[#C8553D]",
    bg: "bg-[#E76F51]/16",
  },
  {
    icon: Waypoints,
    titleKey: "home.features.segmentsTitle",
    descKey: "home.features.segmentsDesc",
    color: "text-[#1B4332]",
    bg: "bg-[#1B4332]/14",
  },
  {
    icon: CloudSun,
    titleKey: "home.features.weatherTitle",
    descKey: "home.features.weatherDesc",
    color: "text-[#2E6282]",
    bg: "bg-[#457B9D]/16",
  },
] as const

interface EmptyStateProps {
  sessionRunnerName: string
  onFileLoaded: (content: string, name: string) => Promise<void>
  onError: (error: string) => void
  fileName: string
  error: string
  isLoading: boolean
  uploadDisabled?: boolean
}

export function EmptyState({
  sessionRunnerName,
  onFileLoaded,
  onError,
  fileName,
  error,
  isLoading,
  uploadDisabled = false,
}: EmptyStateProps) {
  const { t } = useI18n()
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      key="empty"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
      className="mx-auto max-w-lg"
    >
      {/* Greeting (subtle) + Primary Value Prop (h1) */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
        className="mb-5 text-center"
      >
        {sessionRunnerName && (
          <p className="text-sm font-medium text-[#4B5563]">
            {t("home.empty.greeting", { name: sessionRunnerName })}
          </p>
        )}
        <h1 className="mt-1 text-[22px] leading-snug font-semibold tracking-tight text-[#1F2937] sm:text-2xl">
          {t("home.empty.headline")}
        </h1>
      </motion.div>

      {/* Primary CTA: GPX Upload Zone */}
      <UploadCard
        onFileLoaded={onFileLoaded}
        onError={onError}
        fileName={fileName}
        error={error}
        isLoading={isLoading}
        disabled={uploadDisabled}
      />

      {/* Trust Hint */}
      <div className="mt-4 flex flex-col items-center text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4B5563]">
          <Lock className="h-3.5 w-3.5 shrink-0 text-[#1B4332]" aria-hidden="true" />
          <span>{t("home.privacy.hint")}</span>
        </p>
      </div>

      {/* Feature Cards (Flattened info grid - Opsi A) */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: prefersReducedMotion ? 0 : 0.18,
          duration: prefersReducedMotion ? 0 : 0.3,
        }}
        className="my-5 grid grid-cols-2 gap-3"
      >
        {FEATURES.map((f) => (
          <div
            key={f.titleKey}
            className="rounded-xl border border-[#E5E7EB] bg-white/85 p-4"
          >
            <div
              className={`mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl ${f.bg}`}
            >
              <f.icon className={`h-6 w-6 ${f.color}`} aria-hidden="true" />
            </div>
            <p className="heading-4 text-[#1F2937]">{t(f.titleKey)}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#4B5563]">
              {t(f.descKey)}
            </p>
          </div>
        ))}
      </motion.div>

      <Footer runnerName={sessionRunnerName} />
    </motion.div>
  )
}
