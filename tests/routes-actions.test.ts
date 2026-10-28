import { describe, it, expect, beforeEach, vi } from "vitest"
import { saveRouteAction, deleteRouteAction } from "@/app/actions/routes"
import { setSessionForTesting } from "@/lib/auth"
import { setDbForTesting } from "@/lib/db/client"
import { createInMemoryStorage, _setStorageBackendForTesting } from "@/lib/storage"

const sampleGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PlanYourTrail">
  <trk>
    <name>Sample Trail</name>
    <trkseg>
      <trkpt lat="-8.34" lon="116.45"><ele>1000</ele></trkpt>
      <trkpt lat="-8.35" lon="116.46"><ele>1200</ele></trkpt>
      <trkpt lat="-8.36" lon="116.47"><ele>1500</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`

describe("app/actions/routes", () => {
  let fakeStorage: ReturnType<typeof createInMemoryStorage>

  beforeEach(() => {
    vi.clearAllMocks()
    setSessionForTesting(null)
    setDbForTesting(null)
    fakeStorage = createInMemoryStorage()
    _setStorageBackendForTesting(fakeStorage)
  })

  it("returns UNAUTHORIZED when session is missing", async () => {
    setSessionForTesting(null)

    const res = await saveRouteAction({
      name: "Test Route",
      gpxContent: sampleGPX,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("UNAUTHORIZED")
    }
  })

  it("returns VALIDATION_ERROR for empty route name", async () => {
    setSessionForTesting({
      user: { id: "user-123", email: "user@test.com", plan: "free" },
    })

    const res = await saveRouteAction({
      name: "   ",
      gpxContent: sampleGPX,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("VALIDATION_ERROR")
    }
  })

  it("rejects file exceeding Free tier 10MB limit with exact PRD copy", async () => {
    setSessionForTesting({
      user: { id: "user-123", email: "user@test.com", plan: "free" },
    })

    // Create string > 10MB
    const bigContent = "a".repeat(10 * 1024 * 1024 + 10)
    const res = await saveRouteAction({
      name: "Huge Route",
      gpxContent: bigContent,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("FILE_TOO_LARGE")
      expect(res.error.message).toContain("File ini lebih dari 10 MB")
    }
  })

  it("enforces Free tier 3-route limit and returns exact PRD copy", async () => {
    setSessionForTesting({
      user: { id: "user-123", email: "user@test.com", plan: "free" },
    })

    // Mock countActiveRoutes returning 3
    const mockWhere = vi.fn().mockResolvedValue([{ total: 3 }])
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    setDbForTesting({
      select: mockSelect,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await saveRouteAction({
      name: "4th Route",
      gpxContent: sampleGPX,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("LIMIT_REACHED")
      expect(res.error.message).toBe(
        "Kamu sudah menyimpan 3 rute. Hapus salah satu rute, atau daftar early access Pro."
      )
    }
  })

  it("successfully parses, simplifies, gzips, and stores route in S3 and DB", async () => {
    const userId = "user-123"
    setSessionForTesting({
      user: { id: userId, email: "user@test.com", plan: "free" },
    })

    // Mock count returning 1
    const mockWhere = vi.fn().mockResolvedValue([{ total: 1 }])
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    // Mock insert
    const mockReturning = vi.fn().mockImplementation((val) => [val])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

    setDbForTesting({
      select: mockSelect,
      insert: mockInsert,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await saveRouteAction({
      name: "Mount Rinjani Trail",
      gpxContent: sampleGPX,
      raceDate: "2026-11-01",
      runnerName: "Andi",
    })

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.name).toBe("Mount Rinjani Trail")
      expect(res.data.routeId).toBeDefined()

      // Check S3 storage contains gpx/{userId}/{routeId}.gpx.gz
      const expectedKey = `gpx/${userId}/${res.data.routeId}.gpx.gz`
      expect(fakeStorage.files.has(expectedKey)).toBe(true)
      const stored = fakeStorage.files.get(expectedKey)
      expect(stored?.contentEncoding).toBe("gzip")
      expect(stored?.contentType).toBe("application/gpx+xml")

      // Verify DB insert called
      expect(mockInsert).toHaveBeenCalled()
      expect(mockValues).toHaveBeenCalled()
    }
  })

  it("deleteRouteAction requires authentication and verifies owner", async () => {
    setSessionForTesting(null)

    const res = await deleteRouteAction({
      routeId: "a0000000-0000-4000-8000-000000000001",
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("UNAUTHORIZED")
    }
  })

  it("deleteRouteAction deletes both S3 object and DB row for owned route", async () => {
    const userId = "user-123"
    const routeId = "a0000000-0000-4000-8000-000000000001"
    const storageKey = `gpx/${userId}/${routeId}.gpx.gz`

    // Pre-populate S3 fake storage
    fakeStorage.files.set(storageKey, {
      body: new Uint8Array([1, 2, 3]),
      contentEncoding: "gzip",
    })

    setSessionForTesting({
      user: { id: userId, email: "user@test.com", plan: "free" },
    })

    // Mock getRoute returning the owned route
    const mockLimit = vi.fn().mockResolvedValue([
      {
        id: routeId,
        userId,
        name: "Route to delete",
        gpxObjectKey: storageKey,
        hidden: false,
      },
    ])
    const mockWhereGet = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockFromGet = vi.fn().mockReturnValue({ where: mockWhereGet })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFromGet })

    // Mock deleteRoute returning deleted row
    const mockReturningDelete = vi.fn().mockResolvedValue([{ id: routeId }])
    const mockWhereDelete = vi.fn().mockReturnValue({ returning: mockReturningDelete })
    const mockDelete = vi.fn().mockReturnValue({ where: mockWhereDelete })

    setDbForTesting({
      select: mockSelect,
      delete: mockDelete,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await deleteRouteAction({ routeId })

    expect(res.ok).toBe(true)
    // S3 object must be removed permanently
    expect(fakeStorage.files.has(storageKey)).toBe(false)
    expect(mockDelete).toHaveBeenCalled()
  })

  it("deleteRouteAction fails with NOT_FOUND and leaves S3 object intact if route belongs to different user", async () => {
    const userA = "user-A"
    const userB = "user-B"
    const routeIdB = "b0000000-0000-4000-8000-000000000002"
    const storageKeyB = `gpx/${userB}/${routeIdB}.gpx.gz`

    // Pre-populate S3 storage with user B's file
    fakeStorage.files.set(storageKeyB, {
      body: new Uint8Array([9, 9, 9]),
      contentEncoding: "gzip",
    })

    // Logged in as User A
    setSessionForTesting({
      user: { id: userA, email: "userA@test.com", plan: "free" },
    })

    // Mock getRoute("user-A", routeIdB) returning empty (not found for user A)
    const mockLimit = vi.fn().mockResolvedValue([])
    const mockWhereGet = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockFromGet = vi.fn().mockReturnValue({ where: mockWhereGet })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFromGet })

    const mockDelete = vi.fn()

    setDbForTesting({
      select: mockSelect,
      delete: mockDelete,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await deleteRouteAction({ routeId: routeIdB })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND")
      expect(res.error.message).toContain("Rute tidak ditemukan")
    }

    // Crucial: User B's S3 file must NOT be deleted
    expect(fakeStorage.files.has(storageKeyB)).toBe(true)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("deleteRouteAction rejects invalid UUID with VALIDATION_ERROR", async () => {
    setSessionForTesting({
      user: { id: "user-123", email: "user@test.com", plan: "free" },
    })

    const res = await deleteRouteAction({ routeId: "not-a-uuid" })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("VALIDATION_ERROR")
    }
  })
})
