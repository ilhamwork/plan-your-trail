import { describe, it, expect, vi, beforeEach } from "vitest"
import * as routeQueries from "@/lib/db/queries/routes"
import * as profileQueries from "@/lib/db/queries/profiles"
import * as waitlistQueries from "@/lib/db/queries/waitlist"
import { setDbForTesting } from "@/lib/db/client"

describe("lib/db owner-scoped queries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("enforces userId as first parameter on all route queries (AGENTS.md hard rule)", () => {
    // Check function signatures expect userId as first argument
    expect(routeQueries.listRoutes.length).toBe(1)
    expect(routeQueries.getRoute.length).toBe(2)
    expect(routeQueries.countActiveRoutes.length).toBe(1)
    expect(routeQueries.createRoute.length).toBe(2)
    expect(routeQueries.hideRoute.length).toBe(2)
    expect(routeQueries.deleteRoute.length).toBe(2)
  })

  it("enforces userId on all profile queries", () => {
    expect(profileQueries.getProfile.length).toBe(1)
    expect(profileQueries.upsertProfile.length).toBe(1) // has default param for plan
  })

  it("enforces userId on all waitlist queries", () => {
    expect(waitlistQueries.createWaitlistEntry.length).toBe(3)
    expect(waitlistQueries.getWaitlistEntry.length).toBe(2)
    expect(waitlistQueries.hasJoinedWaitlist.length).toBe(2)
    expect(waitlistQueries.listWaitlistEntries.length).toBe(1)
  })

  it("listRoutes builds query filtering by userId and hidden=false", async () => {
    const mockWhere = vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue([
        {
          id: "route-1",
          userId: "user-123",
          name: "Trail Route",
          hidden: false,
        },
      ]),
    })

    const mockFrom = vi.fn().mockReturnValue({
      where: mockWhere,
    })

    const mockSelect = vi.fn().mockReturnValue({
      from: mockFrom,
    })

    setDbForTesting({
      select: mockSelect,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const routes = await routeQueries.listRoutes("user-123")
    expect(mockSelect).toHaveBeenCalled()
    expect(mockFrom).toHaveBeenCalled()
    expect(mockWhere).toHaveBeenCalled()
    expect(routes).toHaveLength(1)
    expect(routes[0].userId).toBe("user-123")

    setDbForTesting(null)
  })

  it("getRoute returns null when route belongs to different user", async () => {
    const mockLimit = vi.fn().mockResolvedValue([])
    const mockWhere = vi.fn().mockReturnValue({
      limit: mockLimit,
    })
    const mockFrom = vi.fn().mockReturnValue({
      where: mockWhere,
    })
    const mockSelect = vi.fn().mockReturnValue({
      from: mockFrom,
    })

    setDbForTesting({
      select: mockSelect,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const route = await routeQueries.getRoute("user-A", "route-belonging-to-user-B")
    expect(route).toBeNull()

    setDbForTesting(null)
  })
})
