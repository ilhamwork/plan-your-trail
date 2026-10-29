"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { User, LogIn, ArrowRight, Sparkles, Check, AlertCircle } from "lucide-react"
import { trackEvent } from "@/lib/analytics/events"
import { useI18n } from "@/lib/i18n/context"

interface SessionNameModalProps {
  isOpen: boolean
  onSubmit: (name: string) => void
}

export function SessionNameModal({ isOpen, onSubmit }: SessionNameModalProps) {
  const { t } = useI18n()
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  // Prevent closing the modal via Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener("keydown", handleWindowKeyDown, true)
    return () => window.removeEventListener("keydown", handleWindowKeyDown, true)
  }, [isOpen])

  const handleGuestSubmit = () => {
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
  }

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
          className="fixed inset-0 z-3000 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl select-text"
          >
            {/* Header */}
            <div className="bg-[#1B4332] p-6 text-white">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                <Sparkles className="h-3 w-3" />
                PlanYourTrail.run
              </span>
              <h3 className="mt-2 text-xl font-bold tracking-tight">
                {t("home.guestModal.title")}
              </h3>
              <p className="mt-1 text-xs text-white/80">
                {t("home.guestModal.desc")}
              </p>
            </div>

            {/* Content options */}
            <div className="space-y-4 p-6">
              {/* Option 1: Masuk ke Akun */}
              <div className="rounded-xl border-2 border-emerald-600/30 bg-emerald-50/50 p-4 transition-all hover:border-emerald-600/50">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B4332] text-white">
                      <LogIn className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        {t("home.guestModal.loginLink")}
                      </h4>
                      <p className="text-[11px] text-gray-600">
                        {t("home.guestModal.orLogin")}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Disarankan
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-gray-600">
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-emerald-600" /> Simpan rute
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-emerald-600" /> Ramalan cuaca
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-emerald-600" /> Estimasi finish
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-emerald-600" /> Unduh GPX
                  </span>
                </div>

                <Link
                  href="/login"
                  onClick={handleLoginClick}
                  className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B4332] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#143326] active:scale-[0.98]"
                >
                  {t("home.guestModal.loginLink")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <div className="mt-2 text-center text-[11px] text-gray-500">
                  {t("auth.noAccount")}{" "}
                  <Link
                    href="/register"
                    onClick={handleLoginClick}
                    className="font-semibold text-[#1B4332] underline hover:text-emerald-800"
                  >
                    {t("nav.register")}
                  </Link>
                </div>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-gray-200" />
                <span className="absolute bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  atau
                </span>
              </div>

              {/* Option 2: Guest / Anon */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition-all hover:border-gray-300">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-200 text-gray-700">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      {t("home.guestModal.startGuest")}
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Coba langsung tanpa login (data hilang saat tab ditutup)
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    <span>
                      {t("home.guestModal.nameLabel")} <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[10px] font-normal normal-case text-gray-400">
                      Wajib diisi
                    </span>
                  </label>
                  <div className="relative">
                    <User className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (error) setError("")
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={t("home.guestModal.namePlaceholder")}
                      className={`w-full rounded-lg border bg-white py-2 pr-3 pl-8 text-xs font-medium text-gray-800 transition outline-none focus:ring-1 ${
                        error
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-200 focus:border-[#1B4332] focus:ring-[#1B4332]/20"
                      }`}
                    />
                  </div>
                  {error && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-500">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGuestSubmit}
                  disabled={!name.trim()}
                  className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#1B4332]/30 bg-white py-2.5 text-xs font-bold text-[#1B4332] shadow-xs transition hover:bg-[#1B4332] hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {t("home.guestModal.startGuest")}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
