import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { verifyCronRequest } from "@/lib/cron/auth"
import { GET as keepAliveGET } from "@/app/api/cron/keep-alive/route"
import { GET as quotaMonitorGET } from "@/app/api/cron/quota-monitor/route"
import { GET as healthGET } from "@/app/api/health/route"
import { _resetEnvForTesting } from "@/lib/env"
import { setDbForTesting } from "@/lib/db/client"
import { OPS_QUOTAS } from "@/lib/entitlements/config"

describe("E7 Ops: Cron Authentication, Keep-Alive, Quota Monitor & Health", () => {
  const originalCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = "test-cron-secret-value-123456"
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

  describe("verifyCronRequest", () => {
    it("returns 503 when CRON_SECRET is not configured", () => {
      delete process.env.CRON_SECRET
      _resetEnvForTesting()

      const req = new Request("http://localhost:3000/api/cron/keep-alive", {
        headers: { Authorization: "Bearer anything" },
      })
      const res = verifyCronRequest(req)
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(503)
      }
    })

    it("returns 401 when Authorization header is missing or malformed", () => {
      const reqNoHeader = new Request("http://localhost:3000/api/cron/keep-alive")
      const res1 = verifyCronRequest(reqNoHeader)
      expect(res1.ok).toBe(false)
      if (!res1.ok) {
        expect(res1.status).toBe(401)
      }

      const reqBasic = new Request("http://localhost:3000/api/cron/keep-alive", {
        headers: { Authorization: "Basic dXNlcjpwYXNz" },
      })
      const res2 = verifyCronRequest(reqBasic)
      expect(res2.ok).toBe(false)
      if (!res2.ok) {
        expect(res2.status).toBe(401)
      }
    })

    it("returns 401 when Bearer token does not match CRON_SECRET", () => {
      const req = new Request("http://localhost:3000/api/cron/keep-alive", {
        headers: { Authorization: "Bearer wrong-secret-token" },
      })
      const res = verifyCronRequest(req)
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(401)
      }
    })

    it("returns ok: true when Bearer token matches CRON_SECRET", () => {
      const req = new Request("http://localhost:3000/api/cron/keep-alive", {
        headers: { Authorization: "Bearer test-cron-secret-value-123456" },
      })
      const res = verifyCronRequest(req)
      expect(res).toEqual({ ok: true })
    })
  })

  describe("GET /api/cron/keep-alive", () => {
    it("rejects unauthorized requests with 401", async () => {
      const req = new Request("http://localhost:3000/api/cron/keep-alive")
      const res = await keepAliveGET(req)
      expect(res.status).toBe(401)
    })

    it("executes keep-alive query and cleans expired cache/rate-limits", async () => {
      const mockExecute = vi.fn().mockResolvedValue([{ keep_alive: 1 }])
      const mockReturning = vi
        .fn()
        .mockResolvedValueOnce([{ key: "weather:1" }, { key: "weather:2" }])
        .mockResolvedValueOnce([{ key: "rate:1" }])
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning })
      const mockDelete = vi.fn().mockReturnValue({ where: mockWhere })

      setDbForTesting({
        execute: mockExecute,
        delete: mockDelete,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const req = new Request("http://localhost:3000/api/cron/keep-alive", {
        headers: { Authorization: "Bearer test-cron-secret-value-123456" },
      })

      const res = await keepAliveGET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.cleaned).toEqual({
        weatherCache: 2,
        rateLimit: 1,
      })
      expect(mockExecute).toHaveBeenCalledTimes(1)
      expect(mockDelete).toHaveBeenCalledTimes(2)
    })
  })

  describe("GET /api/cron/quota-monitor", () => {
    it("rejects unauthorized requests with 401", async () => {
      const req = new Request("http://localhost:3000/api/cron/quota-monitor")
      const res = await quotaMonitorGET(req)
      expect(res.status).toBe(401)
    })

    it("returns healthy status when usage is below warning thresholds", async () => {
      const mockExecute = vi.fn().mockResolvedValue([
        { size_bytes: 50 * 1024 * 1024 }, // 50 MB (10% of 500 MB)
      ])

      const mockWhere = vi.fn().mockResolvedValue([{ count: 5 }])
      const mockFrom = vi
        .fn()
        .mockResolvedValueOnce([{ total: 12 }]) // users
        .mockResolvedValueOnce([{ total: 18 }]) // routes
        .mockReturnValueOnce({ where: mockWhere }) // email rate_limit

      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

      setDbForTesting({
        execute: mockExecute,
        select: mockSelect,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const req = new Request("http://localhost:3000/api/cron/quota-monitor", {
        headers: { Authorization: "Bearer test-cron-secret-value-123456" },
      })

      const res = await quotaMonitorGET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.status).toBe("healthy")
      expect(body.warnings).toEqual([])
      expect(body.metrics.totalUsers).toBe(12)
      expect(body.metrics.totalRoutes).toBe(18)
      expect(body.metrics.dailyEmailResends).toBe(5)
    })

    it("returns warning status when DB size >= 80% or Resend daily emails >= 70%", async () => {
      const warnDbBytes = Math.ceil(
        OPS_QUOTAS.supabaseMaxDbBytes * OPS_QUOTAS.supabaseWarnRatio
      )
      const mockExecute = vi.fn().mockResolvedValue([
        { size_bytes: warnDbBytes }, // 400 MB (80% of 500 MB)
      ])

      const mockWhere = vi.fn().mockResolvedValue([{ count: 75 }]) // 75 emails (>= 70%)
      const mockFrom = vi
        .fn()
        .mockResolvedValueOnce([{ total: 100 }])
        .mockResolvedValueOnce([{ total: 200 }])
        .mockReturnValueOnce({ where: mockWhere })

      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

      setDbForTesting({
        execute: mockExecute,
        select: mockSelect,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const req = new Request("http://localhost:3000/api/cron/quota-monitor", {
        headers: { Authorization: "Bearer test-cron-secret-value-123456" },
      })

      const res = await quotaMonitorGET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.status).toBe("warning")
      expect(body.warnings.length).toBe(2)
      expect(body.warnings[0]).toContain("Database usage")
      expect(body.warnings[1]).toContain("Daily auth email usage")
    })
  })

  describe("GET /api/health deep DB check", () => {
    it("returns { status: 'ok', db: 'ok' } when ?check=db succeeds", async () => {
      const mockExecute = vi.fn().mockResolvedValue([{ "?column?": 1 }])
      setDbForTesting({
        execute: mockExecute,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const req = new Request("http://localhost:3000/api/health?check=db")
      const res = await healthGET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ status: "ok", db: "ok" })
    })

    it("returns 503 when ?check=db fails", async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error("DB down"))
      setDbForTesting({
        execute: mockExecute,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const req = new Request("http://localhost:3000/api/health?check=db")
      const res = await healthGET(req)
      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body.status).toBe("error")
    })
  })
})

