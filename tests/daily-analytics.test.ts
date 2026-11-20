import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { GET, POST } from "@/app/api/cron/daily-analytics/route"
import {
  computeDailyMetrics,
  upsertDailyAnalytics,
  getDailyAnalytics,
  listDailyAnalytics,
} from "@/lib/db/queries/daily-analytics"
import { _resetEnvForTesting } from "@/lib/env"
import { setDbForTesting } from "@/lib/db/client"

describe("Daily Analytics Cron & Database Queries", () => {
  const originalCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = "test-cron-secret-daily-analytics"
    _resetEnvForTesting()
    setDbForTesting(null)
  })

  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = originalCronSecret
    }
    _resetEnvForTesting()
    setDbForTesting(null)
  })

  describe("API Route: /api/cron/daily-analytics", () => {
    it("rejects unauthorized requests with 401", async () => {
      const req = new Request("http://localhost:3000/api/cron/daily-analytics")
      const res = await GET(req)
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.ok).toBe(false)
    })

    it("rejects invalid date parameters with 400", async () => {
      const req = new Request(
        "http://localhost:3000/api/cron/daily-analytics?date=not-a-date",
        {
          headers: {
            Authorization: "Bearer test-cron-secret-daily-analytics",
          },
        }
      )
      const res = await GET(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.ok).toBe(false)
      expect(body.error).toContain("Invalid date format")
    })

    it("successfully computes and upserts metrics with custom date", async () => {
      // Mock queries for computeDailyMetrics:
      // 1. routeAnalysis
      // 2. savedRoute
      // 3. user count
      // 4. waitlist
      // 5. feedback count
      // 6. auditLog count
      const mockAnalyses = [
        {
          id: "a1",
          userId: "user-1",
          source: "upload",
          fileSizeBytes: 1024,
          pointCount: 50,
        },
        {
          id: "a2",
          userId: null,
          source: "example",
          fileSizeBytes: 2048,
          pointCount: 100,
        },
      ]

      const mockRoutes = [
        { id: "r1", hidden: false },
        { id: "r2", hidden: true },
      ]

      const mockWaitlist = [
        { id: "w1", feature: "weather_hourly" },
        { id: "w2", feature: "weather_hourly" },
        { id: "w3", feature: "waypoint_management" },
      ]

      const mockWhere = vi
        .fn()
        .mockResolvedValueOnce(mockAnalyses) // routeAnalysis
        .mockResolvedValueOnce(mockRoutes) // savedRoute
        .mockResolvedValueOnce([{ total: 3 }]) // user count
        .mockResolvedValueOnce(mockWaitlist) // waitlist
        .mockResolvedValueOnce([{ total: 1 }]) // feedback count
        .mockResolvedValueOnce([{ total: 5 }]) // auditLog count

      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

      // Mock upsert
      const mockReturning = vi.fn().mockResolvedValueOnce([
        {
          date: "2026-11-19",
          metrics: {},
          updatedAt: new Date("2026-11-20T00:05:00Z"),
        },
      ])
      const mockOnConflict = vi.fn().mockReturnValue({ returning: mockReturning })
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict })
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

      setDbForTesting({
        select: mockSelect,
        insert: mockInsert,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const req = new Request(
        "http://localhost:3000/api/cron/daily-analytics?date=2026-11-19",
        {
          headers: {
            Authorization: "Bearer test-cron-secret-daily-analytics",
          },
        }
      )

      const res = await GET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.date).toBe("2026-11-19")
      expect(body.metrics.analyses.total).toBe(2)
      expect(body.metrics.analyses.anonymous).toBe(1)
      expect(body.metrics.analyses.authenticated).toBe(1)
      expect(body.metrics.analyses.totalFileSizeBytes).toBe(3072)
      expect(body.metrics.analyses.totalPointsProcessed).toBe(150)
      expect(body.metrics.routes.totalSaved).toBe(2)
      expect(body.metrics.routes.activeSaved).toBe(1)
      expect(body.metrics.routes.hiddenSaved).toBe(1)
      expect(body.metrics.users.newRegistrations).toBe(3)
      expect(body.metrics.waitlist.totalJoined).toBe(3)
      expect(body.metrics.waitlist.byFeature).toEqual({
        weather_hourly: 2,
        waypoint_management: 1,
      })
      expect(body.metrics.feedback.totalSubmitted).toBe(1)
      expect(body.metrics.audit.totalEvents).toBe(5)
    })

    it("handles POST method identically to GET", async () => {
      const mockWhere = vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])

      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
      const mockReturning = vi.fn().mockResolvedValueOnce([
        {
          date: "2026-11-18",
          metrics: {},
          updatedAt: new Date(),
        },
      ])
      const mockOnConflict = vi.fn().mockReturnValue({ returning: mockReturning })
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict })
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

      setDbForTesting({
        select: mockSelect,
        insert: mockInsert,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const req = new Request(
        "http://localhost:3000/api/cron/daily-analytics?date=2026-11-18",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer test-cron-secret-daily-analytics",
          },
        }
      )

      const res = await POST(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.date).toBe("2026-11-18")
    })

    it("returns 500 when calculation throws an unexpected error", async () => {
      const mockFrom = vi.fn().mockImplementation(() => {
        throw new Error("Database connection lost")
      })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

      setDbForTesting({
        select: mockSelect,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const req = new Request(
        "http://localhost:3000/api/cron/daily-analytics?date=2026-11-18",
        {
          headers: {
            Authorization: "Bearer test-cron-secret-daily-analytics",
          },
        }
      )

      const res = await GET(req)
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.ok).toBe(false)
      expect(body.error).toContain("Failed to compute daily analytics")
    })
  })

  describe("Query Helpers", () => {
    it("computeDailyMetrics directly calculates and maps aggregates", async () => {
      const mockAnalyses = [
        {
          id: "a1",
          userId: "user-1",
          source: "upload",
          fileSizeBytes: 1000,
          pointCount: 20,
        },
      ]
      const mockWhere = vi
        .fn()
        .mockResolvedValueOnce(mockAnalyses)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([{ id: "w1", feature: "export_pdf" }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 2 }])

      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

      setDbForTesting({
        select: mockSelect,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const metrics = await computeDailyMetrics("2026-11-19")
      expect(metrics.analyses.total).toBe(1)
      expect(metrics.analyses.authenticated).toBe(1)
      expect(metrics.users.newRegistrations).toBe(1)
      expect(metrics.waitlist.byFeature.export_pdf).toBe(1)
      expect(metrics.audit.totalEvents).toBe(2)
    })

    it("upsertDailyAnalytics performs insert with onConflictDoUpdate", async () => {
      const mockUpserted = {
        date: "2026-11-19",
        metrics: { test: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockReturning = vi.fn().mockResolvedValueOnce([mockUpserted])
      const mockOnConflict = vi.fn().mockReturnValue({ returning: mockReturning })
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict })
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

      setDbForTesting({
        insert: mockInsert,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const result = await upsertDailyAnalytics("2026-11-19", {
        analyses: {
          total: 0,
          anonymous: 0,
          authenticated: 0,
          bySource: { upload: 0, example: 0 },
          totalFileSizeBytes: 0,
          totalPointsProcessed: 0,
        },
        routes: { totalSaved: 0, activeSaved: 0, hiddenSaved: 0 },
        users: { newRegistrations: 0 },
        waitlist: { totalJoined: 0, byFeature: {} },
        feedback: { totalSubmitted: 0 },
        audit: { totalEvents: 0 },
      })
      expect(result).toEqual(mockUpserted)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it("getDailyAnalytics returns record when found", async () => {
      const mockRecord = {
        date: "2026-11-19",
        metrics: { test: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockLimit = vi.fn().mockResolvedValueOnce([mockRecord])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

      setDbForTesting({
        select: mockSelect,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const result = await getDailyAnalytics("2026-11-19")
      expect(result).toEqual(mockRecord)
    })

    it("getDailyAnalytics returns null when not found", async () => {
      const mockLimit = vi.fn().mockResolvedValueOnce([])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

      setDbForTesting({
        select: mockSelect,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const result = await getDailyAnalytics("2026-11-19")
      expect(result).toBeNull()
    })

    it("listDailyAnalytics returns array ordered by date desc", async () => {
      const mockRows = [
        { date: "2026-11-19", metrics: {} },
        { date: "2026-11-18", metrics: {} },
      ]
      const mockLimit = vi.fn().mockResolvedValueOnce(mockRows)
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockFrom = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

      setDbForTesting({
        select: mockSelect,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const list = await listDailyAnalytics(10)
      expect(list).toEqual(mockRows)
      expect(mockLimit).toHaveBeenCalledWith(10)
    })
  })
})
