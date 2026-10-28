import { describe, it, expect, beforeEach, vi } from "vitest"
import { GET } from "@/app/api/routes/[id]/gpx/route"
import { setSessionForTesting } from "@/lib/auth"
import { setDbForTesting } from "@/lib/db/client"
import { createInMemoryStorage, _setStorageBackendForTesting } from "@/lib/storage"

describe("GET /api/routes/[id]/gpx download route handler", () => {
  let fakeStorage: ReturnType<typeof createInMemoryStorage>

  beforeEach(() => {
    vi.clearAllMocks()
    setSessionForTesting(null)
    setDbForTesting(null)
    fakeStorage = createInMemoryStorage()
    _setStorageBackendForTesting(fakeStorage)
  })

  it("returns 401 when unauthenticated", async () => {
    setSessionForTesting(null)

    const request = new Request("http://localhost:3000/api/routes/route-123/gpx")
    const response = await GET(request, {
      params: Promise.resolve({ id: "route-123" }),
    })

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns 404 when route does not exist or belongs to another user", async () => {
    setSessionForTesting({
      user: { id: "user-123", email: "user@test.com", plan: "free" },
    })

    // Mock getRoute returning null (user A trying to download user B's route)
    const mockLimit = vi.fn().mockResolvedValue([])
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    setDbForTesting({
      select: mockSelect,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const request = new Request("http://localhost:3000/api/routes/route-other/gpx")
    const response = await GET(request, {
      params: Promise.resolve({ id: "route-other" }),
    })

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe("Route not found")
  })

  it("redirects owner to 60-second signed URL with 302", async () => {
    const userId = "user-123"
    const routeId = "route-123"
    const storageKey = `gpx/${userId}/${routeId}.gpx.gz`

    // Pre-populate storage
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
        name: "Rinjani 100",
        gpxObjectKey: storageKey,
        hidden: false,
      },
    ])
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    setDbForTesting({
      select: mockSelect,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const request = new Request(`http://localhost:3000/api/routes/${routeId}/gpx`)
    const response = await GET(request, {
      params: Promise.resolve({ id: routeId }),
    })

    expect(response.status).toBe(302)
    const location = response.headers.get("Location")
    expect(location).toContain("mock-r2.cloudflarestorage.com")
    expect(location).toContain(storageKey)
    expect(location).toContain("expires=60")
    expect(location).toContain("filename=Rinjani%20100.gpx")
  })
})
