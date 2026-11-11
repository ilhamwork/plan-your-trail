"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

interface DeleteRouteModalProps {
  isOpen: boolean
  routeName: string
  routeId: string
  onClose: () => void
  onConfirm: (routeId: string) => Promise<void>
}

export function DeleteRouteModal({
  isOpen,
  routeName,
  routeId,
  onClose,
  onConfirm,
}: DeleteRouteModalProps) {
  const { t } = useI18n()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, isDeleting, onClose])

  if (!isOpen) return null

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      setError(null)
      await onConfirm(routeId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus rute.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-route-title"
        className="fixed inset-0 z-1002 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isDeleting && onClose()}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Modal dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-2xl sm:p-8"
        >
          <div className="flex items-center gap-3 text-[#B91C1C]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3
              id="delete-route-title"
              className="heading-3"
            >
              {t("routes.deleteConfirmTitle")}
            </h3>
          </div>

          <p className="mt-4 body-base text-[#4B5563]">
            Apakah Anda yakin ingin menghapus rute{" "}
            <span className="font-semibold text-[#2D3436]">
              &ldquo;{routeName}&rdquo;
            </span>
            ?
          </p>

          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-[#B91C1C]">
            {t("routes.deleteConfirmDesc")}
          </div>

          {error && (
            <p role="alert" className="mt-3 text-xs font-medium text-[#B91C1C]">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-[#2D3436] bg-white px-5 text-sm font-semibold text-[#2D3436] transition hover:bg-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#B91C1C] px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C] disabled:opacity-50"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {isDeleting ? t("common.loading") : t("routes.deleteConfirmBtn")}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
