import { describe, it, expect, beforeEach, vi } from "vitest"
import { saveRouteAction } from "@/app/actions/routes"
import { limits } from "@/lib/entitlements/can"
import { TIER_LIMITS } from "@/lib/entitlements/config"
import { setSessionForTesting } from "@/lib/auth"
import { setDbForTesting } from "@/lib/db/client"
import { createInMemoryStorage, _setStorageBackendForTesting } from "@/lib/storage"

describe("Task E6-T1: Upload limits per tier (Client & Server copy)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSessionForTesting(null)
    setDbForTesting(null)
    const fakeStorage = createInMemoryStorage()
    _setStorageBackendForTesting(fakeStorage)
  })

  it("limits(user) correctly returns tier upload limits", () => {
    // Anonymous: 5 MB
    const anonLimits = limits(null)
    expect(anonLimits.maxUploadBytes).toBe(5 * 1024 * 1024)
    expect(anonLimits.maxUploadBytes).toBe(TIER_LIMITS.anonymous.maxUploadBytes)

    // Free registered: 10 MB
    const freeLimits = limits({
      id: "u-1",
      email: "runner@test.com",
      plan: "free",
    })
    expect(freeLimits.maxUploadBytes).toBe(10 * 1024 * 1024)
    expect(freeLimits.maxUploadBytes).toBe(TIER_LIMITS.free.maxUploadBytes)

    // Pro: 20 MB
    const proLimits = limits({
      id: "u-2",
      email: "pro@test.com",
      plan: "pro",
    })
    expect(proLimits.maxUploadBytes).toBe(20 * 1024 * 1024)
    expect(proLimits.maxUploadBytes).toBe(TIER_LIMITS.pro.maxUploadBytes)
  })

  it("server saveRouteAction rejects Free tier file > 10MB with exact AGENTS.md Section 7 message", async () => {
    setSessionForTesting({
      user: { id: "user-123", email: "runner@test.com", plan: "free" },
    })

    const bigContent = "x".repeat(10 * 1024 * 1024 + 1)
    const res = await saveRouteAction({
      name: "Over limit route",
      gpxContent: bigContent,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("FILE_TOO_LARGE")
      expect(res.error.message).toBe(
        "File ini lebih dari 10 MB. Daftar early access Pro untuk upload sampai 20 MB."
      )
    }
  })

  it("server saveRouteAction rejects Pro tier file > 20MB with exact AGENTS.md Section 7 message", async () => {
    setSessionForTesting({
      user: { id: "user-pro", email: "pro@test.com", plan: "pro" },
    })

    const hugeContent = "x".repeat(20 * 1024 * 1024 + 1)
    const res = await saveRouteAction({
      name: "Over limit route pro",
      gpxContent: hugeContent,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("FILE_TOO_LARGE")
      expect(res.error.message).toBe("File ini melebihi batas upload 20 MB.")
    }
  })
})
