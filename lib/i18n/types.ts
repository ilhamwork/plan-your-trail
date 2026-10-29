import type idMessages from "./messages/id"

export type Locale = "id" | "en"

export const DEFAULT_LOCALE: Locale = "id"
export const LOCALE_COOKIE = "NEXT_LOCALE"
export const SUPPORTED_LOCALES: Locale[] = ["id", "en"]

export type DeepString<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends object
      ? DeepString<T[K]>
      : string
}

export type TranslationSchema = DeepString<typeof idMessages>

export type TranslationKey = string
