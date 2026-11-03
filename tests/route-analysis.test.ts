import { describe, it, expect, beforeEach, vi } from "vitest"
import { recordRouteAnalysisAction } from "@/app/actions/analysis"
import { setSessionForTesting } from "@/lib/auth"
import { setDbForTesting } from "@/lib/db/client"
import {
  createRouteAnalysis,
  listUserRouteAnalyses,
  getRouteAnalysis,
} from "@/lib/db/queries/route-analysis"

describe("app/actions/analysis - recordRouteAnalysisAction", () => {
  beforeEach(() => {
    setSessionForTesting(null)
  })

  it("successfully records route analysis metrics for anonymous user (userId = null)", async () => {
    setSessionForTesting(null)

    const insertedRow = {
      id: "analysis-anon-1",
      userId: null,
      userName: null,
      fileName: "Trail-Track.gpx",
      fileSizeBytes: 1024,
      source: "upload",
      metrics: {
        stats: {
          totalDistance: 25000,
          elevationGain: 1200,
          elevationLoss: 1100,
          highestPoint: 1500,
          lowestPoint: 300,
          waypointCount: 3,
        },
      },
      pointCount: 450,
      createdAt: new Date(),
    }

    const mockReturning = vi.fn().mockResolvedValue([insertedRow])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

    setDbForTesting({
      insert: mockInsert,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await recordRouteAnalysisAction({
      fileName: "Trail-Track.gpx",
      fileSizeBytes: 1024,
      source: "upload",
      pointCount: 450,
      metrics: {
        stats: {
          totalDistance: 25000,
          elevationGain: 1200,
          elevationLoss: 1100,
          highestPoint: 1500,
          lowestPoint: 300,
          waypointCount: 3,
        },
      },
    })

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.id).toBe("analysis-anon-1")
    }

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        userName: null,
        fileName: "Trail-Track.gpx",
        fileSizeBytes: 1024,
        pointCount: 450,
      })
    )
  })

  it("records userName passed in input for anonymous or named session", async () => {
    setSessionForTesting(null)

    const insertedRow = {
      id: "analysis-anon-2",
      userId: null,
      userName: "Trail Runner 99",
      fileName: "Trail.gpx",
      fileSizeBytes: 500,
      source: "upload",
      metrics: {
        stats: {
          totalDistance: 10000,
          elevationGain: 500,
          elevationLoss: 500,
          highestPoint: 800,
          lowestPoint: 300,
          waypointCount: 0,
        },
      },
      pointCount: 100,
      createdAt: new Date(),
    }

    const mockReturning = vi.fn().mockResolvedValue([insertedRow])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

    setDbForTesting({
      insert: mockInsert,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await recordRouteAnalysisAction({
      userName: "Trail Runner 99",
      fileName: "Trail.gpx",
      fileSizeBytes: 500,
      source: "upload",
      pointCount: 100,
      metrics: {
        stats: {
          totalDistance: 10000,
          elevationGain: 500,
          elevationLoss: 500,
          highestPoint: 800,
          lowestPoint: 300,
          waypointCount: 0,
        },
      },
    })

    expect(res.ok).toBe(true)
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userName: "Trail Runner 99",
      })
    )
  })

  it("successfully records route analysis metrics with userId and userName for logged-in user", async () => {
    const userId = "b1111111-1111-4111-8111-111111111111"
    setSessionForTesting({
      user: { id: userId, email: "runner@test.com", name: "Agus Runner", plan: "free" },
    })

    const insertedRow = {
      id: "analysis-user-2",
      userId,
      userName: "Agus Runner",
      fileName: "Rinjani-36K.gpx",
      fileSizeBytes: 2048,
      source: "example",
      metrics: {
        stats: {
          totalDistance: 36000,
          elevationGain: 2500,
          elevationLoss: 2500,
          highestPoint: 3726,
          lowestPoint: 1100,
          waypointCount: 5,
        },
      },
      pointCount: 800,
      createdAt: new Date(),
    }

    const mockReturning = vi.fn().mockResolvedValue([insertedRow])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

    setDbForTesting({
      insert: mockInsert,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await recordRouteAnalysisAction({
      fileName: "Rinjani-36K.gpx",
      fileSizeBytes: 2048,
      source: "example",
      pointCount: 800,
      metrics: {
        stats: {
          totalDistance: 36000,
          elevationGain: 2500,
          elevationLoss: 2500,
          highestPoint: 3726,
          lowestPoint: 1100,
          waypointCount: 5,
        },
      },
    })

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.id).toBe("analysis-user-2")
    }

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        userName: "Agus Runner",
        fileName: "Rinjani-36K.gpx",
        source: "example",
      })
    )
  })

  it("returns VALIDATION_ERROR when input is missing required fields", async () => {
    const res = await recordRouteAnalysisAction({
      fileName: "", // invalid empty string
      fileSizeBytes: 1024,
      pointCount: 10,
      metrics: {},
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("VALIDATION_ERROR")
    }
  })

  it("returns DATABASE_ERROR when insertion fails", async () => {
    setDbForTesting({
      insert: () => {
        throw new Error("DB Connection Error")
      },
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await recordRouteAnalysisAction({
      fileName: "Test.gpx",
      fileSizeBytes: 500,
      source: "upload",
      pointCount: 50,
      metrics: {
        stats: {
          totalDistance: 5000,
          elevationGain: 100,
          elevationLoss: 100,
          highestPoint: 200,
          lowestPoint: 50,
          waypointCount: 0,
        },
      },
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe("DATABASE_ERROR")
    }
  })
})

describe("lib/db/queries/route-analysis", () => {
  it("createRouteAnalysis inserts and returns created record with userName", async () => {
    const sample = {
      id: "a-123",
      userId: null,
      userName: "Trail Guy",
      fileName: "route.gpx",
      fileSizeBytes: 100,
      source: "upload",
      metrics: {
        stats: {
          totalDistance: 1000,
          elevationGain: 50,
          elevationLoss: 50,
          highestPoint: 100,
          lowestPoint: 0,
          waypointCount: 0,
        },
      },
      pointCount: 10,
      createdAt: new Date(),
    }

    const mockReturning = vi.fn().mockResolvedValue([sample])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

    setDbForTesting({
      insert: mockInsert,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const created = await createRouteAnalysis({
      userId: null,
      userName: "Trail Guy",
      fileName: "route.gpx",
      fileSizeBytes: 100,
      source: "upload",
      metrics: sample.metrics,
      pointCount: 10,
    })

    expect(created.id).toBe("a-123")
    expect(created.userName).toBe("Trail Guy")
  })

  it("listUserRouteAnalyses queries route_analysis by userId ordered by createdAt desc", async () => {
    const mockOrderBy = vi.fn().mockResolvedValue([])
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    setDbForTesting({
      select: mockSelect,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    await listUserRouteAnalyses("user-999")
    expect(mockSelect).toHaveBeenCalled()
    expect(mockFrom).toHaveBeenCalled()
    expect(mockWhere).toHaveBeenCalled()
  })

  it("getRouteAnalysis queries single row by id", async () => {
    const sample = { id: "a-1", userName: "Sample User" }
    const mockLimit = vi.fn().mockResolvedValue([sample])
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

    setDbForTesting({
      select: mockSelect,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const found = await getRouteAnalysis("a-1")
    expect(found).toEqual(sample)
  })
})
