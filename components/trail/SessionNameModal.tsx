"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle } from "lucide-react"
import { trackEvent } from "@/lib/analytics/events"
import { useI18n } from "@/lib/i18n/context"

interface SessionNameModalProps {
  isOpen: boolean
  onSubmit: (name: string) => void
}

export function SessionNameModal({ isOpen, onSubmit }: SessionNameModalProps) {
  const { t, locale } = useI18n()
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  const handleGuestSubmit = useCallback(() => {
    const finalName = name.trim()
    if (!finalName) {
      setError("Silakan isi nama kamu untuk lanjut sebagai tamu.")
      return
    }
    setError("")
    trackEvent("register_clicked", {
      source: "welcome_modal_guest",
    })
    onSubmit(finalName)
  }, [name, onSubmit])

  useEffect(() => {
    if (!isOpen) return

    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        trackEvent("register_clicked", {
          source: "welcome_modal_guest",
        })
        onSubmit(name.trim() || "Pelari")
      }
    }
    window.addEventListener("keydown", handleWindowKeyDown)
    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
      window.removeEventListener("keydown", handleWindowKeyDown)
    }
  }, [isOpen, name, onSubmit])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleGuestSubmit()
    }
  }

  const handleLoginClick = () => {
    trackEvent("register_clicked", {
      source: "welcome_modal_login",
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-modal-title"
          aria-describedby="session-modal-desc"
          className="fixed inset-0 z-3000 flex items-center justify-center overscroll-contain bg-black/45 p-4 select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white px-6 py-8 shadow-xl select-text sm:px-8 sm:py-9"
          >
            {/* Brand mark & heading */}
            <div className="flex flex-col items-center text-center">
              <span id="session-modal-title" className="sr-only">
                {t("home.guestModal.title")}
              </span>
              <Image
                src="/text-logo.png"
                alt="PlanYourTrail"
                width={148}
                height={36}
                priority
                className="h-auto w-36"
              />
              <p
                id="session-modal-desc"
                className="mt-1.5 text-sm text-[#6B7280]"
              >
                {t("home.guestModal.desc")}
              </p>
            </div>

            {/* Primary Action: Login & Register */}
            <div className="mt-6 space-y-3">
              <Link
                href="/login"
                onClick={handleLoginClick}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1B4332] px-4 text-base font-semibold text-[#FAF6F1] transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-[0.99]"
              >
                {t("home.guestModal.loginLink")}
              </Link>

              <Link
                href="/register"
                onClick={handleLoginClick}
                className="flex h-12 w-full items-center justify-center rounded-xl border border-[#6B7280] bg-white px-4 text-sm font-semibold text-[#2D3436] transition hover:bg-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-[0.99]"
              >
                {t("nav.register")}
              </Link>
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#E5E7EB]" />
              <span className="text-xs font-normal text-[#6B7280]">
                {locale === "en" ? "or" : "atau"}
              </span>
              <div className="h-px flex-1 bg-[#E5E7EB]" />
            </div>

            {/* Secondary Option: Guest mode */}
            <div>
              <label
                htmlFor="guest-runner-name"
                className="mb-2 block text-xs font-medium text-[#6B7280]"
              >
                {locale === "en"
                  ? "Continue as guest (enter your name)"
                  : "Lanjut sebagai tamu (isi nama kamu)"}
              </label>
              <div className="space-y-3">
                <input
                  id="guest-runner-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (error) setError("")
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={t("home.guestModal.namePlaceholder")}
                  className={`block h-12 w-full rounded-xl border bg-white px-4 text-sm font-normal text-[#2D3436] placeholder:text-[#6B7280] transition outline-none focus-visible:ring-2 ${
                    error
                      ? "border-[#B91C1C] focus-visible:border-[#B91C1C] focus-visible:ring-[#B91C1C]/25"
                      : "border-[#6B7280] focus-visible:border-[#1B4332] focus-visible:ring-[#1B4332]/25"
                  }`}
                />

                <button
                  type="button"
                  onClick={handleGuestSubmit}
                  disabled={!name.trim()}
                  className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#1B4332] px-4 text-sm font-semibold text-[#FAF6F1] transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("home.guestModal.startGuest")}
                </button>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#B91C1C]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}



