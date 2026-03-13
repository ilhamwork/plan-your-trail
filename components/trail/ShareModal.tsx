"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Copy,
  Check,
  Link,
  Share2,
  Download,
  Image as ImageIcon,
} from "lucide-react"
import { toPng } from "html-to-image"
import { ShareCard, type AspectRatio } from "./ShareCard"
import type { ParsedRoute, RouteStats } from "@/lib/types"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  shareId: string | null
  isGenerating: boolean
  route: ParsedRoute | null
  raceName: string
  userName: string
  raceDate: string
}

export function ShareModal({
  isOpen,
  onClose,
  shareId,
  isGenerating,
  route,
  raceName,
  userName,
  raceDate,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [isExportingImage, setIsExportingImage] = useState(false)
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("4:5")

  useEffect(() => {
    if (shareId && typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/share/${shareId}`)
    }
  }, [shareId])

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleDownloadImage = async () => {
    const ratioId = selectedRatio.replace(":", "-")
    const node = document.getElementById(`share-card-${ratioId}`)
    if (!node) {
      console.error("Node not found:", `share-card-${ratioId}`)
      return
    }

    setIsExportingImage(true)
    try {
      // Small delay to ensure Recharts and QRCode are rendered in the hidden div
      await new Promise((resolve) => setTimeout(resolve, 300))

      const dataUrl = await toPng(node, {
        quality: 1,
        pixelRatio: 1, // Already 1080px wide in the component style
        backgroundColor: "#FAF6F1",
        cacheBust: true,
      })

      const link = document.createElement("a")
      link.download = `plan-your-trail-${selectedRatio.replace(":", "x")}-${raceName || "route"}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Error generating image:", err)
    } finally {
      setIsExportingImage(false)
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
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-[#1B4332]">
                <Share2 className="h-5 w-5 text-[#2A9D8F]" />
                Share Route
              </h3>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pt-6">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2A9D8F]/20 border-t-[#2A9D8F]" />
                  <p className="mt-4 text-sm font-medium text-gray-500">
                    Generating shared link...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Share Link Section */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                      Share Link
                    </label>
                    <p className="text-sm text-gray-600">
                      Anyone with this link can view your route analysis
                      dashboard.
                    </p>
                    <div className="relative">
                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 pr-12">
                        <Link className="h-4 w-4 shrink-0 text-gray-400" />
                        <input
                          type="text"
                          readOnly
                          value={shareUrl}
                          className="w-full bg-transparent text-sm text-gray-600 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={handleCopy}
                        className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-lg border border-gray-100 bg-white p-2 text-gray-500 shadow-sm transition-all hover:text-[#2A9D8F] active:scale-95"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100" />

                  {/* Share as Image Section */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                      Share as Image
                    </label>
                    <p className="text-sm text-gray-600">
                      Select an aspect ratio for social media:
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {(["9:16", "4:5"] as AspectRatio[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => setSelectedRatio(r)}
                          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 py-3 transition-all ${
                            selectedRatio === r
                              ? "border-[#1B4332] bg-[#1B4332]/5 text-[#1B4332]"
                              : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200"
                          }`}
                        >
                          <div
                            className={`border-2 ${
                              r === "9:16" ? "h-6 w-3.5" : "h-6 w-5"
                            } ${selectedRatio === r ? "border-[#1B4332]" : "border-gray-300"}`}
                          />
                          <span className="text-[10px] font-bold">
                            {r === "9:16" ? "Stories" : "Posts"}
                          </span>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleDownloadImage}
                      disabled={isExportingImage}
                      className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-[#1B4332] bg-white py-3 text-sm font-bold text-[#1B4332] transition-all hover:bg-[#1B4332] hover:text-white active:scale-95 disabled:opacity-50"
                    >
                      {isExportingImage ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1B4332] border-t-white" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      {isExportingImage
                        ? "Processing..."
                        : `Download ${selectedRatio} Card`}
                    </button>
                  </div>

                  {/* Hidden Card for Exporting */}
                  <div className="fixed top-[-99999px] left-[-99999px] overflow-hidden">
                    {route && (
                      <div className="flex flex-col gap-10">
                        {/* Render the selected one specifically or all for easier capturing */}
                        <ShareCard
                          ratio={selectedRatio}
                          stats={route.stats}
                          points={route.points}
                          raceName={raceName}
                          userName={userName}
                          raceDate={raceDate}
                          shareUrl={shareUrl}
                        />
                      </div>
                    )}
                  </div>

                  {copied && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-xs font-medium text-green-600"
                    >
                      Link copied to clipboard!
                    </motion.p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 text-center">
              <button
                onClick={onClose}
                className="w-full cursor-pointer rounded-xl bg-[#1B4332] py-3 text-sm font-bold text-white transition-all hover:bg-[#2D5A46] active:scale-98"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
