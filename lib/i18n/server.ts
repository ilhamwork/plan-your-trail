import { cookies } from "next/headers"
import type { Locale, TranslationSchema } from "./types"
import { DEFAULT_LOCALE, LOCALE_COOKIE } from "./types"
import idMessages from "./messages/id"
import enMessages from "./messages/en"
import { getTranslation } from "./utils"

export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies()
    const val = cookieStore.get(LOCALE_COOKIE)?.value
    if (val === "id" || val === "en") {
      return val
    }
  } catch {
    // cookies() unavailable in non-request contexts
  }
  return DEFAULT_LOCALE
}

export async function getServerTranslations() {
  const locale = await getServerLocale()
  const messages: TranslationSchema = locale === "en" ? enMessages : idMessages

  return {
    locale,
    messages,
    t: (path: string, params?: Record<string, string | number>) =>
      getTranslation(messages as unknown as Record<string, unknown>, path, params),
  }
}

