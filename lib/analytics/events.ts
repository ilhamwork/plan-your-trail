import { track } from "@vercel/analytics"

/**
 * Fixed Analytics Event Names (AGENTS.md Section 7)
 */
export type AnalyticsEventName =
  | "upload_started"
  | "analysis_completed"
  | "locked_feature_viewed"
  | "register_clicked"
  | "register_completed"
  | "route_saved"
  | "waitlist_joined"
  | "waypoint_added"
  | "waypoint_edited"

export interface AnalyticsEventPayloads {
  upload_started: {
    source?: string
    fileName?: string
    fileSizeBytes?: number
  }
  analysis_completed: {
    source?: string
    distanceKm?: number
    elevationGainM?: number
    pointCount?: number
  }
  locked_feature_viewed: {
    feature: string
    source: string
  }
  register_clicked: {
    source: string
    feature?: string
  }
  register_completed: {
    source?: string
    method: "google" | "email"
  }
  route_saved: {
    source?: string
    routeId?: string
  }
  waitlist_joined: {
    feature: string
    source?: string
  }
  waypoint_added: {
    source?: string
  }
  waypoint_edited: {
    source?: string
  }
}

const PII_KEYS = new Set([
  "email",
  "password",
  "user_name",
  "name",
  "username",
  "runner_name",
  "phone",
  "token",
])

const EMAIL_PATTERN = /\S+@\S+\.\S+/

export function sanitizeEventProps(
  props: Record<string, unknown>
): Record<string, string | number | boolean | null> {
  const sanitized: Record<string, string | number | boolean | null> = {}

  for (const [key, val] of Object.entries(props)) {
    if (PII_KEYS.has(key.toLowerCase())) {
      continue
    }

    if (val === null || val === undefined) {
      continue
    }

    if (typeof val === "string") {
      // Discard values that resemble email addresses
      if (EMAIL_PATTERN.test(val)) {
        continue
      }
      sanitized[key] = val
    } else if (typeof val === "number" || typeof val === "boolean") {
      sanitized[key] = val
    }
  }

  return sanitized
}

type EventListener = (
  event: AnalyticsEventName,
  props: Record<string, string | number | boolean | null>
) => void

let testListener: EventListener | null = null

export function setAnalyticsListenerForTesting(
  listener: EventListener | null
): void {
  testListener = listener
}

/**
 * Dispatches an analytics event with PII sanitization.
 * Never includes PII (emails, names, tokens).
 */
export function trackEvent<E extends AnalyticsEventName>(
  event: E,
  properties?: AnalyticsEventPayloads[E]
): void {
  const sanitized = sanitizeEventProps(
    (properties as Record<string, unknown>) ?? {}
  )

  if (testListener) {
    testListener(event, sanitized)
  }

  try {
    if (typeof window !== "undefined") {
      if (process.env.NODE_ENV === "development") {
        console.log(`%c[Analytics Event] %c${event}`, "color: #3b82f6; font-weight: bold;", "color: inherit;", sanitized)
      }
      track(event, sanitized)
    }
  } catch (error) {
    // Fail silently in non-browser or non-Vercel analytics environments
    console.debug(`[Analytics] failed to track ${event}:`, error)
  }
}
