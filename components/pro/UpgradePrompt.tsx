"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Lock, X, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useUpgradePromptDismissal } from "@/hooks/useUpgradePromptDismissal"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UpgradePromptProps {
  variant: "tooltip" | "overlay" | "inline" | "sheet"
  feature: string
  title?: string
  description?: string
  /**
   * Sheet only. When provided, the sheet is controlled externally — `open`
   * determines visibility and the internal sessionStorage dismissal is
   * bypassed. `onUpgrade` is called when the user closes or upgrades,
   * letting the parent reset its own open state.
   */
  open?: boolean
  onUpgrade?: () => void
  onDeleteRoute?: () => void
  children?: React.ReactNode
}

// ---------------------------------------------------------------------------
// Tooltip variant
// ---------------------------------------------------------------------------

function TooltipVariant({
  feature,
  description,
  children,
}: {
  feature: string
  description?: string
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex">
      {/* Trigger wrapper */}
      <span
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex"
      >
        {children}
      </span>

      {/* Tooltip card */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2"
          >
            <div className="rounded-lg border border-amber-200 bg-white p-3 shadow-lg">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold capitalize text-[#2D3436]">
                    {feature.replace(/_/g, " ")}
                  </p>
                  {description && (
                    <p className="mt-0.5 text-[10px] leading-tight text-gray-500">
                      {description}
                    </p>
                  )}
                  <Link
                    href="/pricing"
                    className="pointer-events-auto mt-1.5 inline-block text-[10px] font-bold text-[#E76F51] hover:underline"
                    tabIndex={-1}
                  >
                    Upgrade to Pro →
                  </Link>
                </div>
              </div>
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Overlay variant
// ---------------------------------------------------------------------------

function OverlayVariant({
  feature,
  title = "Pro Feature",
  description,
  children,
}: {
  feature: string
  title?: string
  description?: string
  children?: React.ReactNode
}) {
  const { dismissed, dismiss } = useUpgradePromptDismissal(`overlay_${feature}`)

  return (
    <div className="relative">
      {/* Content: blurred when not dismissed, normal when dismissed */}
      <div
        className={
          dismissed ? undefined : "pointer-events-none select-none blur-sm"
        }
      >
        {children}
      </div>

      <AnimatePresence>
        {!dismissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/30 backdrop-blur-sm"
          >
            <div className="relative mx-4 w-full max-w-xs rounded-xl border border-amber-200 bg-white p-5 shadow-lg">
              {/* Dismiss */}
              <button
                onClick={dismiss}
                aria-label="Dismiss upgrade prompt"
                className="absolute top-2 right-2 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <Lock className="h-5 w-5 text-amber-600" />
                </div>
                <h4 className="text-sm font-bold text-[#2D3436]">{title}</h4>
                {description && (
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    {description}
                  </p>
                )}
                <Link
                  href="/pricing"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#E76F51] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#E76F51]/90"
                >
                  <Sparkles className="h-3 w-3" />
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* When dismissed: small "Pro feature" badge in top-right corner */}
      {dismissed && (
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            <Lock className="h-2.5 w-2.5" />
            Pro feature
          </span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline variant
// ---------------------------------------------------------------------------

function InlineVariant({
  feature,
  title = "Pro Feature",
  description,
}: {
  feature: string
  title?: string
  description?: string
}) {
  const { dismissed, dismiss } = useUpgradePromptDismissal(`inline_${feature}`)

  if (dismissed) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="mb-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-amber-900 leading-snug">
          {title}
          {description && (
            <span className="font-normal text-amber-700"> {description}</span>
          )}
        </p>
        <Link
          href="/pricing"
          className="mt-1.5 inline-block text-xs font-bold text-[#E76F51] hover:underline"
        >
          Upgrade →
        </Link>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 self-start rounded p-0.5 text-amber-500 transition hover:bg-amber-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Sheet variant
// ---------------------------------------------------------------------------

function SheetVariant({
  feature,
  title = "Save Limit Reached",
  description = "Free plan allows up to 3 saved routes.",
  open,
  onUpgrade,
  onDeleteRoute,
}: {
  feature: string
  title?: string
  description?: string
  open?: boolean
  onUpgrade?: () => void
  onDeleteRoute?: () => void
}) {
  const { dismissed, dismiss } = useUpgradePromptDismissal(`sheet_${feature}`)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Cleanup ref — no body scroll lock; page stays scrollable
  useEffect(() => {
    return () => {}
  }, [])

  // When `open` is provided, visibility is controlled externally — bypass
  // the sessionStorage dismissed state so the sheet re-opens every time the
  // parent sets open=true (e.g. waypoints, share link triggers).
  const isVisible = open !== undefined ? open : !dismissed

  const handleClose = () => {
    dismiss()
    onUpgrade?.()
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Non-blocking backdrop */}
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-40 bg-black/20"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="pointer-events-auto fixed inset-x-0 bottom-0 z-[1200] pb-8 mx-4"
          >
            <div className="mx-auto max-w-lg rounded-2xl border-t border-gray-100 bg-white px-6 py-5 shadow-2xl">
              {/* Header */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Lock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2D3436]">{title}</h3>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  aria-label="Close"
                  className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/pricing"
                  onClick={handleClose}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E76F51] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#E76F51]/90"
                >
                  <Sparkles className="h-4 w-4" />
                  Upgrade to Pro
                </Link>
                {onDeleteRoute && (
                  <button
                    onClick={() => {
                      onDeleteRoute()
                      handleClose()
                    }}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#2D3436] transition hover:bg-gray-50"
                  >
                    Delete a route
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Multi-variant upgrade prompt component.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.3
 */
export function UpgradePrompt({
  variant,
  feature,
  title,
  description,
  open,
  onUpgrade,
  onDeleteRoute,
  children,
}: UpgradePromptProps) {
  switch (variant) {
    case "tooltip":
      return (
        <TooltipVariant feature={feature} description={description}>
          {children}
        </TooltipVariant>
      )
    case "overlay":
      return (
        <OverlayVariant feature={feature} title={title} description={description}>
          {children}
        </OverlayVariant>
      )
    case "inline":
      return (
        <InlineVariant feature={feature} title={title} description={description} />
      )
    case "sheet":
      return (
        <SheetVariant
          feature={feature}
          title={title}
          description={description}
          open={open}
          onUpgrade={onUpgrade}
          onDeleteRoute={onDeleteRoute}
        />
      )
  }
}
