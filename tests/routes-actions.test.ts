import { describe, it, expect, beforeEach, vi } from "vitest"
import { saveRouteAction, updateRouteAction, deleteRouteAction } from "@/app/actions/routes"
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

  it("enforces Free tier max 3 custom waypoints limit", async () => {
    setSessionForTesting({
      user: { id: "user-123", email: "user@test.com", plan: "free" },
    })

    const mockWhere = vi.fn().mockResolvedValue([{ total: 1 }])
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
    setDbForTesting({ select: mockSelect } as unknown as Parameters<typeof setDbForTesting>[0])

    // Submit 4 custom waypoints (!isFromGpx)
    const customWaypoints = [1, 2, 3, 4].map((i) => ({
      name: `WS ${i}`,
      lat: -8.34,
      lon: 116.45,
      ele: 1000,
      distance: i * 1000,
      isFromGpx: false,
    }))

    const res = await saveRouteAction({
      name: "Route with 4 custom waypoints",
      gpxContent: sampleGPX,
      waypoints: customWaypoints,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("WAYPOINT_LIMIT_REACHED")
      expect(res.error.message).toContain("Akun Free hanya dapat menambahkan hingga 3 waypoint kustom")
    }
  })

  it("allows Free tier to save up to 3 custom waypoints alongside GPX waypoints", async () => {
    setSessionForTesting({
      user: { id: "user-123", email: "user@test.com", plan: "free" },
    })

    const mockWhere = vi.fn().mockResolvedValue([{ total: 1 }])
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
    const mockReturning = vi.fn().mockImplementation((val) => [val])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues })
    setDbForTesting({ select: mockSelect, insert: mockInsert } as unknown as Parameters<typeof setDbForTesting>[0])

    // 3 custom waypoints + 2 GPX waypoints
    const mixedWaypoints = [
      { name: "GPX Pos 1", lat: -8.34, lon: 116.45, ele: 1000, distance: 500, isFromGpx: true },
      { name: "GPX Pos 2", lat: -8.345, lon: 116.455, ele: 1050, distance: 1500, isFromGpx: true },
      { name: "Custom 1", lat: -8.35, lon: 116.46, ele: 1100, distance: 2000, isFromGpx: false },
      { name: "Custom 2", lat: -8.355, lon: 116.465, ele: 1150, distance: 3000, isFromGpx: false },
      { name: "Custom 3", lat: -8.36, lon: 116.47, ele: 1200, distance: 4000, isFromGpx: false },
    ]

    const res = await saveRouteAction({
      name: "Mixed Waypoints Route",
      gpxContent: sampleGPX,
      waypoints: mixedWaypoints,
    })

    expect(res.ok).toBe(true)
  })

  it("allows Pro user to save more than 3 custom waypoints", async () => {
    setSessionForTesting({
      user: { id: "user-pro", email: "pro@test.com", plan: "pro" },
    })

    const mockWhere = vi.fn().mockResolvedValue([{ total: 1 }])
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
    const mockReturning = vi.fn().mockImplementation((val) => [val])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues })
    setDbForTesting({ select: mockSelect, insert: mockInsert } as unknown as Parameters<typeof setDbForTesting>[0])

    // 5 custom waypoints
    const proWaypoints = [1, 2, 3, 4, 5].map((i) => ({
      name: `Pro WS ${i}`,
      lat: -8.34,
      lon: 116.45,
      ele: 1000,
      distance: i * 1000,
      isFromGpx: false,
    }))

    const res = await saveRouteAction({
      name: "Pro Route with 5 custom waypoints",
      gpxContent: sampleGPX,
      waypoints: proWaypoints,
    })

    expect(res.ok).toBe(true)
  })
  it("updateRouteAction requires authentication", async () => {
    setSessionForTesting(null)

    const res = await updateRouteAction({
      routeId: "a0000000-0000-4000-8000-000000000001",
      name: "New Name",
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("UNAUTHORIZED")
    }
  })

  it("updateRouteAction returns NOT_FOUND if route belongs to different user", async () => {
    setSessionForTesting({
      user: { id: "user-A", email: "a@test.com", plan: "free" },
    })

    const mockLimit = vi.fn().mockResolvedValue([])
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
    setDbForTesting({ select: mockSelect } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await updateRouteAction({
      routeId: "a0000000-0000-4000-8000-000000000001",
      name: "Renamed",
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("NOT_FOUND")
    }
  })

  it("updateRouteAction enforces Free tier custom waypoint limits", async () => {
    setSessionForTesting({
      user: { id: "user-A", email: "a@test.com", plan: "free" },
    })

    const customWaypoints = [1, 2, 3, 4].map((i) => ({
      name: `WS ${i}`,
      lat: -8.34,
      lon: 116.45,
      ele: 1000,
      distance: i * 1000,
      isFromGpx: false,
    }))

    const res = await updateRouteAction({
      routeId: "a0000000-0000-4000-8000-000000000001",
      waypoints: customWaypoints,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("WAYPOINT_LIMIT_REACHED")
    }
  })

  it("updateRouteAction successfully updates route name, raceDate, and waypoints", async () => {
    const userId = "user-123"
    const routeId = "a0000000-0000-4000-8000-000000000001"
    setSessionForTesting({
      user: { id: userId, email: "user@test.com", plan: "free" },
    })

    // Mock getRoute returning current route
    const existingRoute = {
      id: routeId,
      userId,
      name: "Original Name",
      metrics: {
        stats: { totalDistance: 10000 },
        raceDate: "2026-10-01",
        runnerName: "Andi",
        waypoints: [],
      },
      gpxObjectKey: `gpx/${userId}/${routeId}.gpx.gz`,
      hidden: false,
    }
    const mockLimit = vi.fn().mockResolvedValue([existingRoute])
    const mockWhereGet = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockFromGet = vi.fn().mockReturnValue({ where: mockWhereGet })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFromGet })

    // Mock updateRoute returning updated route
    const updatedRoute = {
      ...existingRoute,
      name: "Updated Race Name",
    }
    const mockReturning = vi.fn().mockResolvedValue([updatedRoute])
    const mockWhereUpdate = vi.fn().mockReturnValue({ returning: mockReturning })
    const mockSet = vi.fn().mockReturnValue({ where: mockWhereUpdate })
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet })

    setDbForTesting({
      select: mockSelect,
      update: mockUpdate,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await updateRouteAction({
      routeId,
      name: "Updated Race Name",
      raceDate: "2026-11-20",
      waypoints: [
        { name: "WS 1", lat: -8.34, lon: 116.45, ele: 1000, distance: 3000, isFromGpx: false },
      ],
    })

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.name).toBe("Updated Race Name")
      expect(res.data.routeId).toBe(routeId)
    }

    expect(mockUpdate).toHaveBeenCalled()
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Updated Race Name",
        metrics: expect.objectContaining({
          raceDate: "2026-11-20",
          waypoints: expect.arrayContaining([
            expect.objectContaining({ name: "WS 1" }),
          ]),
        }),
      })
    )
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
