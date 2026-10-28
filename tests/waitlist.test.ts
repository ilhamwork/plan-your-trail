import { describe, it, expect, vi, beforeEach } from "vitest"
import { joinWaitlistAction } from "@/app/actions/waitlist"
import * as waitlistQueries from "@/lib/db/queries/waitlist"
import { setSessionForTesting } from "@/lib/auth"
import { setDbForTesting } from "@/lib/db/client"

describe("lib/db/queries/waitlist (Owner-scoped queries)", () => {
  it("enforces userId as first parameter on all waitlist queries (AGENTS.md hard rule)", () => {
    expect(waitlistQueries.createWaitlistEntry.length).toBe(3) // userId, feature, survey
    expect(waitlistQueries.getWaitlistEntry.length).toBe(2) // userId, feature
    expect(waitlistQueries.hasJoinedWaitlist.length).toBe(2) // userId, feature
    expect(waitlistQueries.listWaitlistEntries.length).toBe(1) // userId
  })

  it("createWaitlistEntry inserts row with userId and feature", async () => {
    const mockReturning = vi.fn().mockResolvedValue([
      {
        id: "w-1",
        userId: "user-123",
        feature: "waypoint_management",
        survey: null,
        createdAt: new Date(),
      },
    ])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

    setDbForTesting({
      insert: mockInsert,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await waitlistQueries.createWaitlistEntry(
      "user-123",
      "waypoint_management"
    )

    expect(mockInsert).toHaveBeenCalled()
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        feature: "waypoint_management",
      })
    )
    expect(res.userId).toBe("user-123")
    expect(res.feature).toBe("waypoint_management")

    setDbForTesting(null)
  })

  it("getWaitlistEntry queries filtering by userId and feature", async () => {
    const mockLimit = vi.fn().mockResolvedValue([
      {
        id: "w-1",
        userId: "user-123",
        feature: "weather_hourly",
      },
    ])
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    setDbForTesting({
      select: mockSelect,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await waitlistQueries.getWaitlistEntry(
      "user-123",
      "weather_hourly"
    )

    expect(mockSelect).toHaveBeenCalled()
    expect(mockFrom).toHaveBeenCalled()
    expect(mockWhere).toHaveBeenCalled()
    expect(res?.feature).toBe("weather_hourly")

    setDbForTesting(null)
  })
})

describe("app/actions/waitlist (joinWaitlistAction)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSessionForTesting(null)
    setDbForTesting(null)
  })

  it("returns UNAUTHORIZED when no authenticated session", async () => {
    setSessionForTesting(null)

    const res = await joinWaitlistAction({ feature: "weather_hourly" })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("UNAUTHORIZED")
    }
  })

  it("returns VALIDATION_ERROR when feature is empty or invalid", async () => {
    setSessionForTesting({
      user: { id: "user-123", email: "runner@trail.com", plan: "free" },
    })

    const res = await joinWaitlistAction({ feature: "" })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("VALIDATION_ERROR")
    }
  })

  it("successfully joins waitlist when authenticated and not already joined", async () => {
    setSessionForTesting({
      user: { id: "user-123", email: "runner@trail.com", plan: "free" },
    })

    // Mock rate limit check (select from rate_limit returns [])
    const mockLimitRl = vi.fn().mockResolvedValue([])
    const mockWhereRl = vi.fn().mockReturnValue({ limit: mockLimitRl })
    const mockFromRl = vi.fn().mockReturnValue({ where: mockWhereRl })

    // Mock getWaitlistEntry returns [] (not existing)
    const mockLimitWaitlist = vi.fn().mockResolvedValue([])
    const mockWhereWaitlist = vi.fn().mockReturnValue({ limit: mockLimitWaitlist })
    const mockFromWaitlist = vi.fn().mockReturnValue({ where: mockWhereWaitlist })

    let selectCount = 0
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCount++
      if (selectCount === 1) {
        // Rate limit select
        return { from: mockFromRl }
      }
      // Waitlist existing check
      return { from: mockFromWaitlist }
    })

    // Mock insert into rate_limit and waitlist
    const mockInsertValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        {
          id: "w-new",
          userId: "user-123",
          feature: "waypoint_management",
          createdAt: new Date(),
        },
      ]),
    })
    const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })

    setDbForTesting({
      select: mockSelect,
      insert: mockInsert,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await joinWaitlistAction({ feature: "waypoint_management" })

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.id).toBe("w-new")
      expect(res.data.feature).toBe("waypoint_management")
      expect(res.data.alreadyJoined).toBe(false)
    }
  })

  it("returns alreadyJoined: true when user is already registered for feature", async () => {
    setSessionForTesting({
      user: { id: "user-123", email: "runner@trail.com", plan: "free" },
    })

    // Mock rate limit check returns []
    const mockLimitRl = vi.fn().mockResolvedValue([])
    const mockWhereRl = vi.fn().mockReturnValue({ limit: mockLimitRl })
    const mockFromRl = vi.fn().mockReturnValue({ where: mockWhereRl })

    // Mock getWaitlistEntry returns existing row
    const mockLimitWaitlist = vi.fn().mockResolvedValue([
      {
        id: "w-existing",
        userId: "user-123",
        feature: "cutoff_estimator",
      },
    ])
    const mockWhereWaitlist = vi.fn().mockReturnValue({ limit: mockLimitWaitlist })
    const mockFromWaitlist = vi.fn().mockReturnValue({ where: mockWhereWaitlist })

    let selectCount = 0
    const mockSelect = vi.fn().mockImplementation(() => {
      selectCount++
      if (selectCount === 1) {
        return { from: mockFromRl }
      }
      return { from: mockFromWaitlist }
    })

    const mockInsertValues = vi.fn().mockResolvedValue([{}])
    const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues })

    setDbForTesting({
      select: mockSelect,
      insert: mockInsert,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await joinWaitlistAction({ feature: "cutoff_estimator" })

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.id).toBe("w-existing")
      expect(res.data.feature).toBe("cutoff_estimator")
      expect(res.data.alreadyJoined).toBe(true)
    }
  })
})
