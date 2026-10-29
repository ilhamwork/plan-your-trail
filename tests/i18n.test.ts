import { describe, it, expect } from "vitest"
import idMessages from "../lib/i18n/messages/id"
import enMessages from "../lib/i18n/messages/en"
import { getTranslation } from "../lib/i18n/utils"

describe("i18n schema and dictionary completeness", () => {
  it("en dictionary must match all keys in id dictionary", () => {
    function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
      return Object.keys(obj).flatMap((key) => {
        const val = obj[key]
        const currentPath = prefix ? `${prefix}.${key}` : key
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          return getKeys(val as Record<string, unknown>, currentPath)
        }
        return [currentPath]
      })
    }

    const idKeys = getKeys(idMessages).sort()
    const enKeys = getKeys(enMessages).sort()

    expect(idKeys).toEqual(enKeys)
  })

  it("dictionaries must not contain banned AI slop buzzwords", () => {
    const BANNED_BUZZWORDS = [
      "unleash",
      "elevate",
      "seamless",
      "revolutionize",
      "cutting-edge",
      "game-changer",
      "berdayakan",
      "revolusioner",
    ]

    function getAllLeafStrings(obj: Record<string, unknown>): string[] {
      return Object.values(obj).flatMap((val) => {
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          return getAllLeafStrings(val as Record<string, unknown>)
        }
        return typeof val === "string" ? [val.toLowerCase()] : []
      })
    }

    const allStrings = [
      ...getAllLeafStrings(idMessages),
      ...getAllLeafStrings(enMessages),
    ]

    for (const text of allStrings) {
      for (const word of BANNED_BUZZWORDS) {
        expect(text).not.toContain(word)
      }
    }
  })
})

describe("i18n translation resolver getTranslation", () => {
  it("resolves nested keys accurately", () => {
    const textId = getTranslation(idMessages, "common.cancel")
    expect(textId).toBe("Batal")

    const textEn = getTranslation(enMessages, "common.cancel")
    expect(textEn).toBe("Cancel")
  })

  it("interpolates parameters correctly", () => {
    const template = "Maksimal {count} rute"
    const resolved = getTranslation({ test: { limit: template } }, "test.limit", {
      count: 3,
    })
    expect(resolved).toBe("Maksimal 3 rute")
  })

  it("falls back to key string when path not found", () => {
    const resolved = getTranslation(idMessages, "non.existent.key")
    expect(resolved).toBe("non.existent.key")
  })
})

