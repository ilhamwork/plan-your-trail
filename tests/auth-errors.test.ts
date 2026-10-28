import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { parseAuthError, withAuthTimeout } from "@/lib/auth/errors"

describe("lib/auth/errors: Error Parsing & Timeout Fallbacks", () => {
  const originalWindow = globalThis.window
  const originalNavigator = globalThis.navigator

  beforeEach(() => {
    vi.clearAllMocks()
    // By default in tests, simulate online browser environment
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
      writable: true,
    })
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    })
  })

  describe("parseAuthError", () => {
    it("returns offline message when browser is offline", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: { onLine: false },
        configurable: true,
        writable: true,
      })

      const msg = parseAuthError(new Error("any error"))
      expect(msg).toContain("Tidak ada koneksi internet")
    })

    it("returns timeout message for AbortError or timeout messages", () => {
      const abortError = new Error("The operation was aborted")
      abortError.name = "AbortError"
      expect(parseAuthError(abortError)).toContain("Waktu koneksi habis")

      const timeoutError = new Error("Request timeout exceeded")
      expect(parseAuthError(timeoutError)).toContain("Waktu koneksi habis")
    })

    it("returns network error message for fetch / connection failures", () => {
      const failedFetch = new TypeError("Failed to fetch")
      expect(parseAuthError(failedFetch)).toContain("Gagal terhubung")

      const networkErr = new Error("NetworkError when attempting to fetch resource")
      expect(parseAuthError(networkErr)).toContain("Gagal terhubung")

      const econnRefused = new Error("connect ECONNREFUSED 127.0.0.1:5432")
      expect(parseAuthError(econnRefused)).toContain("Gagal terhubung")
    })

    it("returns system error message for status >= 500 or INTERNAL_SERVER_ERROR", () => {
      const internal500 = { status: 500, message: "Internal Server Error" }
      expect(parseAuthError(internal500)).toContain("Terjadi kendala pada sistem")

      const server503 = { status: 503, statusText: "Service Unavailable" }
      expect(parseAuthError(server503)).toContain("Terjadi kendala pada sistem")

      const dbCode = { code: "INTERNAL_SERVER_ERROR", message: "Failed to query database" }
      expect(parseAuthError(dbCode)).toContain("Terjadi kendala pada sistem")

      const postgresMsg = { status: 400, message: "postgres connection terminated unexpectedly" }
      expect(parseAuthError(postgresMsg)).toContain("Terjadi kendala pada sistem")
    })

    it("handles nested error structures from Better Auth", () => {
      const nested = {
        error: {
          status: 500,
          code: "INTERNAL_SERVER_ERROR",
        },
      }
      expect(parseAuthError(nested)).toContain("Terjadi kendala pada sistem")
    })

    it("returns rate limit message for 429 / TOO_MANY_REQUESTS", () => {
      const rateLimitErr = { status: 429, message: "Too many requests" }
      expect(parseAuthError(rateLimitErr)).toContain("Terlalu banyak percobaan")
    })

    it("returns unverified email message for EMAIL_NOT_VERIFIED", () => {
      const unverified = { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" }
      expect(parseAuthError(unverified)).toContain("Email belum diverifikasi")
    })

    it("returns already registered message for USER_ALREADY_EXISTS", () => {
      const existingUser = { code: "USER_ALREADY_EXISTS", message: "User already exists" }
      expect(parseAuthError(existingUser)).toContain("Email ini sudah terdaftar")
    })

    it("returns invalid credentials message for 401 / INVALID_EMAIL_OR_PASSWORD", () => {
      const invalidPass = { status: 401, code: "INVALID_EMAIL_OR_PASSWORD" }
      expect(parseAuthError(invalidPass)).toContain("Email atau kata sandi tidak valid")
    })

    it("returns default fallback message when error is unknown", () => {
      const unknown = null
      expect(parseAuthError(unknown, "Custom fallback")).toBe("Custom fallback")
    })
  })

  describe("withAuthTimeout", () => {
    it("resolves when the action completes before the timeout", async () => {
      const fastAction = new Promise<{ ok: boolean }>((resolve) => {
        setTimeout(() => resolve({ ok: true }), 50)
      })

      const result = await withAuthTimeout(fastAction, 500)
      expect(result).toEqual({ ok: true })
    })

    it("throws immediately when browser is offline", async () => {
      Object.defineProperty(globalThis, "navigator", {
        value: { onLine: false },
        configurable: true,
        writable: true,
      })

      const neverResolves = new Promise<never>(() => {})

      await expect(withAuthTimeout(neverResolves, 1000)).rejects.toThrow(
        "Tidak ada koneksi internet"
      )
    })

    it("rejects with timeout error when action exceeds timeoutMs", async () => {
      const slowAction = new Promise<string>((resolve) => {
        setTimeout(() => resolve("done"), 500)
      })

      await expect(
        withAuthTimeout(slowAction, 50, "Waktu koneksi habis")
      ).rejects.toThrow("Waktu koneksi habis")
    })
  })
})
