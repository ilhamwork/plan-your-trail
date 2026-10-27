import type { SessionUser } from "../auth"
import { PRO_LAUNCHED, TIER_LIMITS } from "./config"

export type Tier = "anonymous" | "free" | "pro"

export type Feature =
  | "weather_session"
  | "waypoint_gpx_chart"
  | "pace_basic"
  | "save_route"
  | "download_gpx"
  | "waypoint_management"
  | "waypoint_user_chart"
  | "nutrition_notes"
  | "weather_hourly"
  | "cutoff_estimator"
  | "export_pdf"
  | "share_link"
  | "compare_routes"

let proLaunchedOverride: boolean | null = null

/**
 * Test helper to toggle PRO_LAUNCHED status.
 */
export function _setProLaunchedForTesting(value: boolean | null): void {
  proLaunchedOverride = value
}

function isProLaunched(): boolean {
  return proLaunchedOverride !== null ? proLaunchedOverride : PRO_LAUNCHED
}

/**
 * Access decision matrix implemented strictly per AGENTS.md Section 5.
 *
 * @param user Current session user or null for Anonymous
 * @param feature Feature name
 */
export function can(user: SessionUser | null, feature: Feature): boolean {
  if (!user) {
    // Anonymous has no access to any of the 12 gated features
    return false
  }

  const proLaunched = isProLaunched()
  const isPro = user.plan === "pro"

  switch (feature) {
    // Features for all registered accounts (Free and Pro)
    case "weather_session":
    case "waypoint_gpx_chart":
    case "pace_basic":
    case "save_route":
    case "download_gpx":
      return true

    // Free until Pro launch; moves to Pro-only after Pro launch
    case "waypoint_management":
      return !proLaunched || isPro

    // Pro-only features: locked until Pro launch, then requires pro plan
    case "waypoint_user_chart":
    case "nutrition_notes":
    case "weather_hourly":
    case "cutoff_estimator":
    case "export_pdf":
    case "share_link":
    case "compare_routes":
      return proLaunched && isPro

    default:
      return false
  }
}

/**
 * Upload size limits and route count limits per tier.
 */
export function limits(user: SessionUser | null): {
  maxUploadBytes: number
  maxSavedRoutes: number | null
} {
  if (!user) {
    return {
      maxUploadBytes: TIER_LIMITS.anonymous.maxUploadBytes,
      maxSavedRoutes: TIER_LIMITS.anonymous.maxSavedRoutes,
    }
  }

  if (user.plan === "pro") {
    return {
      maxUploadBytes: TIER_LIMITS.pro.maxUploadBytes,
      maxSavedRoutes: TIER_LIMITS.pro.maxSavedRoutes,
    }
  }

  return {
    maxUploadBytes: TIER_LIMITS.free.maxUploadBytes,
    maxSavedRoutes: TIER_LIMITS.free.maxSavedRoutes,
  }
}
