"use client"

import { memo, useCallback, useRef, useState } from "react"
import { FileUp, FileCheck, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useEntitlements } from "@/lib/entitlements"
import { useI18n } from "@/lib/i18n/context"

interface UploadCardProps {
  onFileLoaded: (content: string, fileName: string) => void
  onError?: (message: string) => void
  fileName?: string
  error?: string
  isLoading?: boolean
}

export const UploadCard = memo(function UploadCard({
  onFileLoaded,
  onError,
  fileName,
  error,
  isLoading,
}: UploadCardProps) {
  const { user, limits } = useEntitlements()
  const { t } = useI18n()
  const [isDragging, setIsDragging] = useState(false)
  const [isLoadingExample, setIsLoadingExample] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      // Clear previous errors if parent provided onError
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
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleLoadExample = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsLoadingExample(true)
      try {
        const response = await fetch("/Rinjani-36K-2026.gpx")
        const content = await response.text()
        onFileLoaded(content, "Rinjani-36K-2026.gpx")
      } catch (err) {
        console.error("Failed to load example:", err)
      } finally {
        setIsLoadingExample(false)
      }
    },
    [onFileLoaded]
  )

  const hasFile = !!fileName
  const isBusy = isLoading || isLoadingExample

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col gap-4">
        <div
          className={`relative cursor-pointer overflow-hidden rounded-2xl bg-[#1B4332] text-white shadow-lg transition-all duration-300 hover:bg-[#2D5A46] ${
            hasFile ? "p-3" : "p-8 text-center sm:p-10"
          } ${isDragging ? "scale-[1.02] ring-4 ring-[#E76F51]" : ""} ${
            isBusy ? "pointer-events-none opacity-90" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isBusy && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".gpx"
            onChange={handleChange}
            className="hidden"
            disabled={isBusy}
          />

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="parsing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-center gap-3 py-2"
              >
                <Loader2 className="h-6 w-6 animate-spin text-[#2A9D8F]" />
                <div className="text-left">
                  <p className="text-sm font-bold text-white">
                    {t("common.loading")}
                  </p>
                  <p className="text-[11px] font-medium text-[#FAF6F1]/80">
                    GPX analysis
                  </p>
                </div>
              </motion.div>
            ) : hasFile ? (
              <motion.div
                key="loaded"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2A9D8F]/20 text-[#2A9D8F]">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div className="max-w-9/12 min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    {fileName}
                  </p>
                  <p className="text-[10px] font-medium text-[#FAF6F1]/80">
                    GPX loaded • {Math.round(limits.maxUploadBytes / (1024 * 1024))} MB max
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <FileUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#FAF6F1]">
                      {t("home.upload.dropTitle")}
                    </p>
                    <p className="text-sm text-[#FAF6F1]/80">
                      {t("home.upload.dropSubtitle")}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-[#FAF6F1]/75">
                      (Maks {Math.round(limits.maxUploadBytes / (1024 * 1024))} MB)
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!hasFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex w-full items-center gap-3">
              <div className="h-px flex-1 bg-[#E5E7EB]" />
              <span className="text-xs font-medium text-[#4B5563]">
                atau
              </span>
              <div className="h-px flex-1 bg-[#E5E7EB]" />
            </div>

            <button
              type="button"
              onClick={handleLoadExample}
              disabled={isBusy}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#1B4332] bg-white px-4 py-2 text-sm font-semibold text-[#1B4332] shadow-2xs transition-all hover:bg-[#1B4332] hover:text-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-[0.98] disabled:opacity-50"
            >
              {isLoadingExample ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1B4332]/20 border-t-[#1B4332]" />
              ) : (
                "Try GPX Example"
              )}
            </button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
            className="mt-2 text-center text-sm font-medium text-[#B91C1C]"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
})
