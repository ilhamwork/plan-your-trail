"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BookmarkPlus, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_KEY = "anonymous_nudge_dismissed"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AnonymousNudgeProps {
  /** Only rendered when true — parent controls whether analysis is complete. */
  analysisComplete: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Non-blocking, dismissible banner prompting anonymous users to register
 * and save their GPX analysis results.
 *
 * Rendering rules:
 *  - Only shown when `analysisComplete` is true (Req 7.2)
 *  - Dismissal is stored in sessionStorage; never re-shows in the same
 *    browser session after being dismissed (Req 7.1)
 *
 * Requirements: 7.1, 7.2
 */
export function AnonymousNudge({ analysisComplete }: AnonymousNudgeProps) {
  const [dismissed, setDismissed] = useState(true) // Start hidden; hydrate below
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from sessionStorage after mount (SSR-safe)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      setDismissed(stored === "true")
    } catch {
      // sessionStorage unavailable — default to showing the nudge
      setDismissed(false)
    }
    setHydrated(true)
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(SESSION_KEY, "true")
    } catch {
      // Best-effort
    }
  }

  // Don't render anything until hydrated (prevents SSR flash) or if conditions
  // not met (Req 7.2: only after analysis is complete)
  if (!hydrated || !analysisComplete || dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        // Sticky bottom bar — non-blocking; user can still scroll and interact
        className="fixed inset-x-0 bottom-0 z-[1200] px-4 pb-4 pt-0 pointer-events-none"
      >
        <div className="pointer-events-auto mx-auto max-w-2xl">
          <div className="flex items-center gap-3 rounded-xl border border-[#2A9D8F]/30 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
            {/* Icon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2A9D8F]/10">
              <BookmarkPlus className="h-4 w-4 text-[#2A9D8F]" />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#2D3436]">
                Don&apos;t lose your analysis
              </p>
              <p className="text-xs text-gray-500">
                Create a free account to save this route and access it later.
              </p>
            </div>

            {/* CTA */}
            <Link
              href="/auth/register"
              className="shrink-0 rounded-lg bg-[#2A9D8F] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#2A9D8F]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A9D8F]"
            >
              Sign up free
            </Link>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss save prompt"
              className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
