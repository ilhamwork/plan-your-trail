"use client"

import { useState } from "react"
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isDeleting && onClose()}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        >
          <div className="flex items-center gap-3 text-red-600">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t("routes.deleteConfirmTitle")}</h3>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Apakah Anda yakin ingin menghapus rute{" "}
            <span className="font-semibold text-gray-900">&ldquo;{routeName}&rdquo;</span>?
          </p>

          <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-800">
            {t("routes.deleteConfirmDesc")}
          </div>

          {error && (
            <p className="mt-3 text-xs font-medium text-red-600">{error}</p>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-red-500 disabled:opacity-50"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isDeleting ? t("common.loading") : t("routes.deleteConfirmBtn")}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
