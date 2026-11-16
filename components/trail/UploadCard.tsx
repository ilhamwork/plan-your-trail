"use client"

import { memo, useCallback, useRef, useState } from "react"
import { FileUp, FileCheck, Loader2, Route, RotateCcw } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { useEntitlements } from "@/lib/entitlements"
import { useI18n } from "@/lib/i18n/context"
import { SAMPLE_ROUTE_META } from "@/lib/gpx/sample-route"

interface UploadCardProps {
  onFileLoaded: (content: string, fileName: string) => void
  onError?: (message: string) => void
  fileName?: string
  error?: string
  isLoading?: boolean
  disabled?: boolean
}

export const UploadCard = memo(function UploadCard({
  onFileLoaded,
  onError,
  fileName,
  error,
  isLoading,
  disabled = false,
}: UploadCardProps) {
  const { user, limits } = useEntitlements()
  const { t, locale } = useI18n()
  const prefersReducedMotion = useReducedMotion()
  const [isDragging, setIsDragging] = useState(false)
  const [isLoadingExample, setIsLoadingExample] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const maxMb = Math.round(limits.maxUploadBytes / (1024 * 1024))

  const handleFile = useCallback(
    (file: File) => {
      if (onError) onError("")

      if (!file.name.toLowerCase().endsWith(".gpx")) {
        if (onError) onError(t("home.upload.invalidType"))
        return
      }

      if (file.size > limits.maxUploadBytes) {
        let msg: string
        if (!user) {
          msg = t("home.upload.limitAnon")
        } else if (user.plan === "pro") {
          msg = t("home.upload.limitPro")
        } else {
          msg = t("home.upload.limitFree")
        }
        if (onError) onError(msg)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        onFileLoaded(content, file.name)
      }
      reader.readAsText(file)
    },
    [onFileLoaded, onError, limits.maxUploadBytes, user, t]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) {
        onError?.(t("home.upload.authOrGuestRequired"))
        return
      }
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [disabled, handleFile, onError, t]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      // Reset input so selecting the same file again triggers onChange
      e.target.value = ""
    },
    [handleFile]
  )

  const openFilePicker = useCallback(() => {
    if (disabled) {
      onError?.(t("home.upload.authOrGuestRequired"))
      return
    }
    if (!isLoading && !isLoadingExample) {
      inputRef.current?.click()
    }
  }, [disabled, isLoading, isLoadingExample, onError, t])

  const handleRetry = useCallback(() => {
    onError?.("")
    openFilePicker()
  }, [onError, openFilePicker])

  const handleLoadExample = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled) {
        onError?.(t("home.upload.authOrGuestRequired"))
        return
      }
      setIsLoadingExample(true)
      try {
        const response = await fetch(SAMPLE_ROUTE_META.publicPath)
        const content = await response.text()
        onFileLoaded(content, SAMPLE_ROUTE_META.fileName)
      } catch (err) {
        console.error("Failed to load example:", err)
        onError?.(t("home.upload.parseError"))
      } finally {
        setIsLoadingExample(false)
      }
    },
    [disabled, onError, onFileLoaded, t]
  )

  const hasFile = !!fileName
  const isBusy = isLoading || isLoadingExample
  const isBlocked = isBusy || disabled

  const formattedDistance = new Intl.NumberFormat(
    locale === "id" ? "id-ID" : "en-US",
    { maximumFractionDigits: 1 }
  ).format(SAMPLE_ROUTE_META.distanceKm)
  const formattedGain = new Intl.NumberFormat(
    locale === "id" ? "id-ID" : "en-US"
  ).format(SAMPLE_ROUTE_META.elevationGainM)

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.35 }}
    >
      <div className="flex flex-col gap-4">
        <input
          ref={inputRef}
          type="file"
          accept=".gpx"
          onChange={handleChange}
          className="hidden"
          disabled={isBlocked}
        />

        <button
          type="button"
          aria-label={t("home.upload.dropzoneAria")}
          onClick={openFilePicker}
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled) setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          disabled={isBusy}
          className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl text-white shadow-lg transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] ${
            hasFile ? "p-3 text-left" : "p-3 text-center sm:p-4"
          } ${
            isDragging
              ? "bg-[#245540] ring-4 ring-[#E76F51]"
              : "bg-[#1B4332] hover:bg-[#245540]"
          } ${isBlocked ? "opacity-90" : ""}`}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="parsing"
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
                className="flex items-center justify-center gap-3 py-4"
              >
                <Loader2 className="h-6 w-6 animate-spin text-[#74C69D]" />
                <div className="text-left">
                  <p className="text-sm font-bold text-white">
                    {t("common.loading")}
                  </p>
                  <p className="text-xs font-medium text-[#FAF6F1]/90">
                    {t("home.upload.analyzingSubtitle")}
                  </p>
                </div>
              </motion.div>
            ) : hasFile ? (
              <motion.div
                key="loaded"
                initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2A9D8F]/25 text-[#74C69D]">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div className="max-w-9/12 min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    {fileName}
                  </p>
                  <p className="text-xs font-medium text-[#FAF6F1]/90">
                    {t("home.upload.loadedSubtitle", { maxMb })}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
                className={`flex flex-col items-center gap-3.5 rounded-xl px-4 py-6 sm:px-6 sm:py-8 ${
                  isDragging
                    ? "border-2 border-solid border-[#FAF6F1]"
                    : "border-2 border-dashed border-[#FAF6F1]/40"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                  <FileUp className="h-6 w-6 text-[#FAF6F1]" />
                </div>

                <div>
                  <p className="text-lg font-bold tracking-tight text-[#FAF6F1]">
                    <span className="hidden [@media(pointer:fine)]:inline">
                      {t("home.upload.dropTitle")}
                    </span>
                    <span className="inline [@media(pointer:fine)]:hidden">
                      {t("home.upload.dropTitleMobile")}
                    </span>
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#FAF6F1]/90">
                    <span className="hidden [@media(pointer:fine)]:inline">
                      {t("home.upload.dropSubtitle")}
                    </span>
                    <span className="inline [@media(pointer:fine)]:hidden">
                      {t("home.upload.dropSubtitleMobile")}
                    </span>
                  </p>
                </div>

                <span className="mt-1 inline-flex min-h-11 items-center justify-center rounded-full bg-[#FAF6F1] px-6 py-2 text-sm font-semibold text-[#1B4332] shadow-xs transition group-hover:bg-white">
                  {t("home.upload.browseBtn")}
                </span>

                <p className="text-xs font-medium text-[#FAF6F1]/90">
                  {t("home.upload.helperFormat", { maxMb })}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {error && (
          <div
            role="alert"
            className="flex flex-col items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center sm:flex-row sm:text-left"
          >
            <p className="text-sm font-medium text-[#B91C1C]">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#B91C1C]/30 bg-white px-3.5 py-2 text-xs font-semibold text-[#B91C1C] transition hover:bg-red-100/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("home.upload.retryBtn")}</span>
            </button>
          </div>
        )}

        {!hasFile && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: prefersReducedMotion ? 0 : 0.12,
              duration: prefersReducedMotion ? 0 : 0.3,
            }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex w-full items-center gap-3">
              <div className="h-px flex-1 bg-[#E5E7EB]" />
              <span className="text-xs font-medium text-[#4B5563]">
                {t("home.upload.orDivider")}
              </span>
              <div className="h-px flex-1 bg-[#E5E7EB]" />
            </div>

            <button
              type="button"
              onClick={handleLoadExample}
              disabled={isBlocked}
              className="flex min-h-12 w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-[#1B4332] bg-white px-4 py-2.5 text-[#1B4332] shadow-2xs transition-colors hover:bg-[#1B4332] hover:text-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-[0.99] disabled:opacity-50"
            >
              {isLoadingExample ? (
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("home.upload.sampleLoading")}</span>
                </div>
              ) : (
                <>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Route className="h-4 w-4 shrink-0" />
                    <span>{t("home.upload.exampleBtn")}</span>
                  </span>
                  <span className="text-xs font-medium opacity-80">
                    {t("home.upload.exampleHint", {
                      name: SAMPLE_ROUTE_META.name,
                      distance: formattedDistance,
                      gain: formattedGain,
                    })}
                  </span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
})
