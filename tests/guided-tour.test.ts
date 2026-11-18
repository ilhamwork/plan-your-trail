import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { getTourSteps } from "../lib/tour/steps"
import {
  readTourCompletion,
  markTourPhaseCompleted,
  resetTourCompletion,
  shouldAutoStartTour,
  TOUR_STORAGE_KEY,
} from "../lib/tour/storage"
import idMessages from "../lib/i18n/messages/id"
import enMessages from "../lib/i18n/messages/en"
import { getTranslation } from "../lib/i18n/utils"

describe("guided tour steps", () => {
  it("provides distinct empty and analysis tours for guest and registered users", () => {
    const guestEmpty = getTourSteps("guest", "empty")
    const guestAnalysis = getTourSteps("guest", "analysis")
    const regEmpty = getTourSteps("registered", "empty")
    const regAnalysis = getTourSteps("registered", "analysis")

    expect(guestEmpty.length).toBeGreaterThanOrEqual(2)
    expect(guestAnalysis.length).toBeGreaterThanOrEqual(3)
    expect(regEmpty.length).toBeGreaterThanOrEqual(2)
    expect(regAnalysis.length).toBeGreaterThanOrEqual(4)

    // Registered analysis includes unlocked features (waypoints, pace, weather)
    const regIds = regAnalysis.map((s) => s.id)
    expect(regIds).toContain("registered-waypoints")
    expect(regIds).toContain("registered-pace")
    expect(regIds).toContain("registered-weather")

    // Guest analysis includes locked features summary instead of individual unlocked cards
    const guestIds = guestAnalysis.map((s) => s.id)
    expect(guestIds).toContain("guest-locked")
    expect(guestIds).not.toContain("registered-waypoints")
  })

  it("all step translation keys resolve in both id and en dictionaries", () => {
    const allSteps = [
      ...getTourSteps("guest", "empty"),
      ...getTourSteps("guest", "analysis"),
      ...getTourSteps("registered", "empty"),
      ...getTourSteps("registered", "analysis"),
    ]

    for (const step of allSteps) {
      expect(step.targetSelector.length).toBeGreaterThan(0)
      const idTitle = getTranslation(idMessages, step.titleKey)
      const idDesc = getTranslation(idMessages, step.descriptionKey)
      const enTitle = getTranslation(enMessages, step.titleKey)
      const enDesc = getTranslation(enMessages, step.descriptionKey)

      expect(idTitle).not.toBe(step.titleKey)
      expect(idDesc).not.toBe(step.descriptionKey)
      expect(enTitle).not.toBe(step.titleKey)
      expect(enDesc).not.toBe(step.descriptionKey)
    }
  })
})

describe("guided tour persistence", () => {
  const store: Record<string, string> = {}

  beforeEach(() => {
    for (const key of Object.keys(store)) {
      delete store[key]
    }
    const mockLocalStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = val
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key]
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length
      },
    }
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: mockLocalStorage },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
  })

  it("auto-starts each audience and phase on first visit", () => {
    const initial = readTourCompletion()
    expect(shouldAutoStartTour(initial, "guest", "empty")).toBe(true)
    expect(shouldAutoStartTour(initial, "guest", "analysis")).toBe(true)
    expect(shouldAutoStartTour(initial, "registered", "empty")).toBe(true)
    expect(shouldAutoStartTour(initial, "registered", "analysis")).toBe(true)
  })

  it("tracks guest and registered tour completion independently", () => {
    markTourPhaseCompleted("guest", "empty")
    markTourPhaseCompleted("guest", "analysis")

    const afterGuest = readTourCompletion()
    expect(shouldAutoStartTour(afterGuest, "guest", "empty")).toBe(false)
    expect(shouldAutoStartTour(afterGuest, "guest", "analysis")).toBe(false)
    // User who later registers should still see the registered tour
    expect(shouldAutoStartTour(afterGuest, "registered", "empty")).toBe(true)
    expect(shouldAutoStartTour(afterGuest, "registered", "analysis")).toBe(true)
  })

  it("resets completion state for a single audience or all", () => {
    markTourPhaseCompleted("guest", "empty")
    markTourPhaseCompleted("registered", "empty")

    resetTourCompletion("guest")
    let state = readTourCompletion()
    expect(state.guest.empty).toBe(false)
    expect(state.registered.empty).toBe(true)

    resetTourCompletion()
    state = readTourCompletion()
    expect(state.guest.empty).toBe(false)
    expect(state.registered.empty).toBe(false)
    expect(store[TOUR_STORAGE_KEY]).toBeDefined()
  })
})
