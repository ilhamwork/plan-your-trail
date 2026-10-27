/**
 * Entitlements & limits configuration.
 * Values from PRD v2.6 / AGENTS.md Section 5.
 */

const MB = 1024 * 1024

export const PRO_LAUNCHED = false // flip at Pro launch (Tahap 3)

export const TIER_LIMITS = {
  anonymous: { maxUploadBytes: 5 * MB, maxSavedRoutes: 0 },
  free: { maxUploadBytes: 10 * MB, maxSavedRoutes: 3 },
  pro: { maxUploadBytes: 20 * MB, maxSavedRoutes: null }, // fair-use cap TBD (PRD 11.2)
} as const
