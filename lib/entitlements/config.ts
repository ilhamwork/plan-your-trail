/**
 * Entitlements & limits configuration.
 * Values from PRD v2.6 / AGENTS.md Section 3, 5, 7, 8 & 9.6.
 */

const MB = 1024 * 1024

export const PRO_LAUNCHED = false // flip at Pro launch (Tahap 3)

export const TIER_LIMITS = {
  anonymous: { maxUploadBytes: 5 * MB, maxSavedRoutes: 0 },
  free: { maxUploadBytes: 10 * MB, maxSavedRoutes: 3 },
  pro: { maxUploadBytes: 20 * MB, maxSavedRoutes: null }, // fair-use cap TBD (PRD 11.2)
} as const

/**
 * Centralized rate limit thresholds (AGENTS.md Section 3: never hardcode rate limits).
 */
export const RATE_LIMITS = {
  weatherPerDay: 20,
  weatherWindowSeconds: 86400,
  saveRoutePerHour: 20,
  saveRouteWindowSeconds: 3600,
  deleteRoutePerHour: 30,
  deleteRouteWindowSeconds: 3600,
  downloadGpxPerHour: 30,
  downloadGpxWindowSeconds: 3600,
  waitlistPerHour: 10,
  waitlistWindowSeconds: 3600,
  authPerMinute: 15,
  authWindowSeconds: 60,
  emailResendCooldownSeconds: 60,
} as const

/**
 * Bounded GPX parsing limits (AGENTS.md Section 8: size, point count, no external entity resolution).
 */
export const GPX_BOUNDS = {
  maxParseBytes: 20 * MB,
  maxPoints: 100_000,
  maxWaypoints: 1_000,
} as const

/**
 * Operational database and service quota thresholds (PRD Section 9.6 & E7).
 */
export const OPS_QUOTAS = {
  maxDbBytes: 500 * MB,
  dbWarnRatio: 0.8,
  resendDailyLimit: 100,
  resendWarnRatio: 0.7,
} as const
