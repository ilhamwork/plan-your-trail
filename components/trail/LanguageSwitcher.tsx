"use client"

import { useI18n } from "@/lib/i18n/context"
import type { Locale } from "@/lib/i18n/types"

interface LanguageSwitcherProps {
  className?: string
}

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n()

  const handleSelect = (nextLocale: Locale) => {
    if (nextLocale !== locale) {
      setLocale(nextLocale)
    }
  }

  return (
    <div
      role="group"
      aria-label="Language selection"
      className={`inline-flex items-center rounded-lg bg-white/10 p-0.5 text-xs font-semibold backdrop-blur-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => handleSelect("id")}
        aria-pressed={locale === "id"}
        className={`rounded-md px-2 py-1 transition-all ${
          locale === "id"
            ? "bg-white text-[#1B4332] shadow-xs"
            : "text-white/80 hover:text-white"
        }`}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => handleSelect("en")}
        aria-pressed={locale === "en"}
        className={`rounded-md px-2 py-1 transition-all ${
          locale === "en"
            ? "bg-white text-[#1B4332] shadow-xs"
            : "text-white/80 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  )
}

