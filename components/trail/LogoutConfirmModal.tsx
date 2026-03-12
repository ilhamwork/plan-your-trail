"use client"

import { motion, AnimatePresence } from "framer-motion"
import { LogOut, X } from "lucide-react"

interface LogoutConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: LogoutConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <LogOut className="h-5 w-5" />
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4">
                <h3 className="text-xl font-bold text-gray-900">Logout</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Are you sure you want to log out? Your current session will be ended.
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 active:scale-95"
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
