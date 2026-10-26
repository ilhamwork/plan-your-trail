import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  trackEvent,
  sanitizeEventProps,
  setAnalyticsListenerForTesting,
  type AnalyticsEventName,
} from "@/lib/analytics/events"

describe("lib/analytics/events", () => {
  const eventsReceived: Array<{
    event: AnalyticsEventName
    props: Record<string, unknown>
  }> = []

  beforeEach(() => {
    eventsReceived.length = 0
    setAnalyticsListenerForTesting((event, props) => {
      eventsReceived.push({ event, props })
    })
  })

  afterEach(() => {
    setAnalyticsListenerForTesting(null)
  })

  it("sanitizes PII keys from event payload", () => {
    const raw = {
      source: "upload_button",
      email: "runner@example.com",
      name: "Runner John",
      user_name: "john_doe",
      distanceKm: 42.195,
      safeFlag: true,
    }

    const sanitized = sanitizeEventProps(raw)

    expect(sanitized).toEqual({
      source: "upload_button",
      distanceKm: 42.195,
      safeFlag: true,
    })
    expect(sanitized).not.toHaveProperty("email")
    expect(sanitized).not.toHaveProperty("name")
    expect(sanitized).not.toHaveProperty("user_name")
  })

  it("sanitizes email strings found in generic properties", () => {
    const raw = {
      source: "runner@test.org",
      validSource: "home_page",
    }

    const sanitized = sanitizeEventProps(raw)
    expect(sanitized).toEqual({
      validSource: "home_page",
    })
  })

  it("successfully tracks upload_started and analysis_completed", () => {
    trackEvent("upload_started", {
      fileName: "test_trail.gpx",
      fileSizeBytes: 1024,
      source: "upload",
    })

    trackEvent("analysis_completed", {
      source: "upload",
      distanceKm: 25.5,
      elevationGainM: 1200,
      pointCount: 3500,
    })

    expect(eventsReceived).toHaveLength(2)
    expect(eventsReceived[0].event).toBe("upload_started")
    expect(eventsReceived[0].props).toEqual({
      fileName: "test_trail.gpx",
      fileSizeBytes: 1024,
      source: "upload",
    })

    expect(eventsReceived[1].event).toBe("analysis_completed")
    expect(eventsReceived[1].props).toEqual({
      source: "upload",
      distanceKm: 25.5,
      elevationGainM: 1200,
      pointCount: 3500,
    })
  })

  it("supports all 9 fixed event names from Section 7", () => {
    const fixedEvents: AnalyticsEventName[] = [
      "upload_started",
      "analysis_completed",
      "locked_feature_viewed",
      "register_clicked",
      "register_completed",
      "route_saved",
      "waitlist_joined",
      "waypoint_added",
      "waypoint_edited",
    ]

    for (const evt of fixedEvents) {
      if (evt === "locked_feature_viewed") {
        trackEvent(evt, { feature: "weather_hourly", source: "weather_card" })
      } else if (evt === "register_clicked") {
        trackEvent(evt, { source: "banner" })
      } else if (evt === "register_completed") {
        trackEvent(evt, { method: "google" })
      } else if (evt === "waitlist_joined") {
        trackEvent(evt, { feature: "export_pdf", source: "modal" })
      } else {
        trackEvent(evt, { source: "test" })
      }
    }

    expect(eventsReceived).toHaveLength(fixedEvents.length)
  })
})
