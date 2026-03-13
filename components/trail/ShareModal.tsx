"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Copy, Check, Share2, Link as LinkIcon } from "lucide-react"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  shareUrl: string
  routeName: string
}

export function ShareModal({
  isOpen,
  onClose,
  shareUrl,
  routeName,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-1002 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A9D8F]/10">
                  <Share2 className="h-4 w-4 text-[#2A9D8F]" />
                </div>
                <h3 className="text-lg font-bold text-[#1B4332]">Share Route</h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="mb-4 text-sm text-gray-600">
                Anyone with this link can view the map, elevation profile, and metrics for{" "}
                <span className="font-bold text-[#1B4332]">
                  {routeName || "this route"}
                </span>.
              </p>

              <div className="relative mb-6">
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 pr-12">
                  <LinkIcon className="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full bg-transparent text-sm text-gray-600 outline-none"
                  />
                </div>
                <button
                  onClick={handleCopy}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white p-2 text-[#2A9D8F] shadow-sm transition-all hover:bg-gray-50 active:scale-95"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
                >
                  Close
                </button>
                <button
                  onClick={handleCopy}
                  className="flex-1 rounded-xl bg-[#2A9D8F] py-3 text-sm font-bold text-white shadow-lg shadow-[#2A9D8F]/20 transition-all hover:bg-[#268a7e] active:scale-95"
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
