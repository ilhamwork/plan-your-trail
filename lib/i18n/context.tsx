"use client"

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react"
import type { Locale, TranslationKey, TranslationSchema } from "./types"
import { DEFAULT_LOCALE, LOCALE_COOKIE } from "./types"
import idMessages from "./messages/id"
import enMessages from "./messages/en"
import { getTranslation } from "./utils"

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (path: TranslationKey | string, params?: Record<string, string | number>) => string
  messages: TranslationSchema
}

const I18nContext = createContext<I18nContextValue | null>(null)

const DICTIONARIES: Record<Locale, TranslationSchema> = {
  id: idMessages,
  en: enMessages,
}

function getCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${LOCALE_COOKIE})=([^;]*)`))
  if (match && (match[3] === "id" || match[3] === "en")) {
    return match[3] as Locale
  }
  return null
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return initialLocale || getCookieLocale() || DEFAULT_LOCALE
  })

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof document !== "undefined") {
      document.cookie = `${LOCALE_COOKIE}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`
    }
  }, [])

  const messages = useMemo(() => DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE], [locale])

  const t = useCallback(
    (path: TranslationKey | string, params?: Record<string, string | number>): string => {
      const activeDict = DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE]
      const text = getTranslation(activeDict as unknown as Record<string, unknown>, path, params)
      if (text !== path) {
        return text
      }
      // Fallback to default locale (id) if missing in active locale
      if (locale !== DEFAULT_LOCALE) {
        return getTranslation(
          DICTIONARIES[DEFAULT_LOCALE] as unknown as Record<string, unknown>,
          path,
          params
        )
      }
      return path
    },
    [locale]
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      messages,
    }),
    [locale, setLocale, t, messages]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    // Graceful fallback outside provider
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (path, params) =>
        getTranslation(DICTIONARIES[DEFAULT_LOCALE] as unknown as Record<string, unknown>, path, params),
      messages: DICTIONARIES[DEFAULT_LOCALE],
    }
  }
  return context
}
