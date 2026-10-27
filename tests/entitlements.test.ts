import { describe, it, expect, beforeEach } from "vitest"
import { can, limits, _setProLaunchedForTesting, type Feature } from "@/lib/entitlements/can"
import { TIER_LIMITS } from "@/lib/entitlements/config"
import type { SessionUser } from "@/lib/auth"

const ALL_FEATURES: Feature[] = [
  "weather_session",
  "waypoint_gpx_chart",
  "pace_basic",
  "save_route",
  "download_gpx",
  "waypoint_management",
  "waypoint_user_chart",
  "nutrition_notes",
  "weather_hourly",
  "cutoff_estimator",
  "export_pdf",
  "share_link",
  "compare_routes",
]

const freeUser: SessionUser = {
  id: "u-free",
  email: "free@example.com",
  plan: "free",
}

const proUser: SessionUser = {
  id: "u-pro",
  email: "pro@example.com",
  plan: "pro",
}

describe("E3: Entitlements Access Decision Matrix (AGENTS.md Section 5)", () => {
  beforeEach(() => {
    _setProLaunchedForTesting(null) // Reset to default PRO_LAUNCHED
  })

  describe("Anonymous Tier (user is null)", () => {
    it("denies access to every gated feature", () => {
      for (const feature of ALL_FEATURES) {
        expect(can(null, feature)).toBe(false)
      }
    })

    it("returns anonymous limits (5MB, 0 saved routes)", () => {
      const res = limits(null)
      expect(res.maxUploadBytes).toBe(TIER_LIMITS.anonymous.maxUploadBytes)
      expect(res.maxSavedRoutes).toBe(0)
    })
  })

  describe("Free Registered Tier (Before Pro Launch)", () => {
    beforeEach(() => {
      _setProLaunchedForTesting(false)
    })

    it("allows standard Free features", () => {
      expect(can(freeUser, "weather_session")).toBe(true)
      expect(can(freeUser, "waypoint_gpx_chart")).toBe(true)
      expect(can(freeUser, "pace_basic")).toBe(true)
      expect(can(freeUser, "save_route")).toBe(true)
      expect(can(freeUser, "download_gpx")).toBe(true)
    })

    it("allows waypoint_management temporarily before Pro launch", () => {
      expect(can(freeUser, "waypoint_management")).toBe(true)
    })

    it("denies Pro-only features", () => {
      const proOnlyFeatures: Feature[] = [
        "waypoint_user_chart",
        "nutrition_notes",
        "weather_hourly",
        "cutoff_estimator",
        "export_pdf",
        "share_link",
        "compare_routes",
      ]

      for (const feature of proOnlyFeatures) {
        expect(can(freeUser, feature)).toBe(false)
      }
    })

    it("returns free limits (10MB, 3 saved routes)", () => {
      const res = limits(freeUser)
      expect(res.maxUploadBytes).toBe(TIER_LIMITS.free.maxUploadBytes)
      expect(res.maxSavedRoutes).toBe(3)
    })
  })

  describe("Free Registered Tier (After Pro Launch)", () => {
    beforeEach(() => {
      _setProLaunchedForTesting(true)
    })

    it("still allows standard Free features", () => {
      expect(can(freeUser, "weather_session")).toBe(true)
      expect(can(freeUser, "waypoint_gpx_chart")).toBe(true)
      expect(can(freeUser, "pace_basic")).toBe(true)
      expect(can(freeUser, "save_route")).toBe(true)
      expect(can(freeUser, "download_gpx")).toBe(true)
    })

    it("locks waypoint_management after Pro launch for Free users", () => {
      expect(can(freeUser, "waypoint_management")).toBe(false)
    })

    it("denies Pro-only features", () => {
      expect(can(freeUser, "weather_hourly")).toBe(false)
      expect(can(freeUser, "cutoff_estimator")).toBe(false)
      expect(can(freeUser, "export_pdf")).toBe(false)
    })
  })

  describe("Pro Tier (Before Pro Launch)", () => {
    beforeEach(() => {
      _setProLaunchedForTesting(false)
    })

    it("allows standard Free features and waypoint_management", () => {
      expect(can(proUser, "weather_session")).toBe(true)
      expect(can(proUser, "waypoint_gpx_chart")).toBe(true)
      expect(can(proUser, "waypoint_management")).toBe(true)
    })

    it("keeps Pro-only features locked before Pro launch", () => {
      expect(can(proUser, "weather_hourly")).toBe(false)
      expect(can(proUser, "export_pdf")).toBe(false)
      expect(can(proUser, "cutoff_estimator")).toBe(false)
    })

    it("returns pro limits (20MB, null maxSavedRoutes)", () => {
      const res = limits(proUser)
      expect(res.maxUploadBytes).toBe(TIER_LIMITS.pro.maxUploadBytes)
      expect(res.maxSavedRoutes).toBeNull()
    })
  })

  describe("Pro Tier (After Pro Launch)", () => {
    beforeEach(() => {
      _setProLaunchedForTesting(true)
    })

    it("allows ALL features across the matrix", () => {
      for (const feature of ALL_FEATURES) {
        expect(can(proUser, feature)).toBe(true)
      }
    })

    it("returns pro limits (20MB, null maxSavedRoutes)", () => {
      const res = limits(proUser)
      expect(res.maxUploadBytes).toBe(TIER_LIMITS.pro.maxUploadBytes)
      expect(res.maxSavedRoutes).toBeNull()
    })
  })
})
