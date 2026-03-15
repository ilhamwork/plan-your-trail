"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Share2, Image as ImageIcon, Download, Share } from "lucide-react"
import { toPng } from "html-to-image"
import { supabase } from "@/lib/supabase"
import { ShareCard } from "./ShareCard"
import type { GPXData } from "@/lib/types"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  route: GPXData | null
  raceName: string
  userName: string
  raceDate: string
}

export function ShareModal({
  isOpen,
  onClose,
  route,
  raceName,
  userName,
  raceDate,
}: ShareModalProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Use effect for client-side window detection
  useEffect(() => {
    const checkIsMobile = () => {
      // Breakpoint matching project's typical tablet/desktop split
      setIsMobile(window.innerWidth < 1024)
    }

    checkIsMobile()
    window.addEventListener("resize", checkIsMobile)
    return () => window.removeEventListener("resize", checkIsMobile)
  }, [])

  const recordShareTelemetry = async (type: "download" | "native_share") => {
    if (!route) return
    try {
      await supabase.from("user_shares").insert([
        {
          user_name: userName,
          race_name: raceName,
          race_date: raceDate,
          share_type: type,
          distance: parseFloat((route.stats.totalDistance / 1000).toFixed(2)),
          elevation_gain: route.stats.elevationGain,
        },
      ])
    } catch (err) {
      console.error("Failed to record share telemetry:", err)
    }
  }

  const generateImageBlob = async (): Promise<Blob | null> => {
    const node = document.getElementById("share-card-content")
    if (!node) {
      console.error("Capture node not found")
      return null
    }

    try {
      // Small delay to ensure Recharts components are rendered
      await new Promise((resolve) => setTimeout(resolve, 300))

      const dataUrl = await toPng(node, {
        quality: 1,
        pixelRatio: 2, // High resolution for sharing
        backgroundColor: undefined, // Supports transparency
        cacheBust: true,
      })

      const res = await fetch(dataUrl)
      return await res.blob()
    } catch (err) {
      console.error("Error generating image:", err)
      return null
    }
  }

  const handleDownloadImage = async () => {
    setIsDownloading(true)
    const blob = await generateImageBlob()
    if (blob) {
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.download = `PlanYourTrail - ${raceName || "route"}.png`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
      // Record telemetry
      await recordShareTelemetry("download")
    }
    setIsDownloading(false)
  }

  const handleNativeShare = async () => {
    if (!navigator.share) {
      alert("Sharing is not supported on this browser.")
      return
    }

    setIsExporting(true)
    const blob = await generateImageBlob()
    if (blob) {
      try {
        const file = new File(
          [blob],
          `PlanYourTrail - ${raceName || "route"}.png`,
          { type: "image/png" }
        )
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: raceName || "My Trail Run",
            text: "Check out my route analysis on Plan Your Trail!",
          })
          // Record telemetry
          await recordShareTelemetry("native_share")
        } else {
          alert("Your browser doesn't support file sharing.")
        }
      } catch (err) {
        console.error("Share failed:", err)
      }
    }
    setIsExporting(false)
  }

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share

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
                Share Stats
              </h3>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-8">
              <div className="space-y-6">
                <div className="space-y-1 text-center">
                  <p className="text-sm font-medium text-gray-500">
                    Your route stats are ready to share
                  </p>
                  <p className="text-sm leading-relaxed text-gray-400">
                    Don't forget to tag{" "}
                    <span className="font-semibold text-[#1B4332]">
                      @ilhamontrail
                    </span>{" "}
                    🏃‍♂️⛰️
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  {isMobile ? (
                    // On Mobile/Tablet: Show only Native Share
                    canNativeShare && (
                      <button
                        onClick={handleNativeShare}
                        disabled={isExporting}
                        className="group flex w-1/2 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1B4332] py-4 text-sm font-bold text-white transition-all hover:bg-[#2D5A46] active:scale-95 disabled:opacity-50"
                      >
                        {isExporting ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        ) : (
                          <Share className="h-4 w-4" />
                        )}
                        Share to Stories
                      </button>
                    )
                  ) : (
                    // On Desktop: Show only Save as Image
                    <button
                      onClick={handleDownloadImage}
                      disabled={isDownloading}
                      className="group flex w-1/2 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1B4332] py-4 text-sm font-bold text-white transition-all hover:bg-[#2D5A46] active:scale-95 disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Save to device
                    </button>
                  )}
                </div>

                {/* Hidden Card for Exporting */}
                <div className="fixed top-[-99999px] left-[-99999px] overflow-hidden">
                  {route && (
                    <ShareCard
                      stats={route.stats}
                      points={route.trackPoints}
                      raceName={raceName}
                      userName={userName}
                      raceDate={raceDate}
                      shareUrl=""
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
