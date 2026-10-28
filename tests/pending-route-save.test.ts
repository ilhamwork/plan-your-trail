import { describe, it, expect, beforeEach } from "vitest"
import {
  storePendingRoute,
  clearPendingRoute,
  PENDING_ROUTE_KEY,
  type PendingRouteData,
} from "@/components/trail/hooks/usePendingRouteSave"

const storageMap = new Map<string, string>()
const mockSessionStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  length: 0,
  key: () => null,
}

describe("usePendingRouteSave anonymous-to-register retention", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    })
    storageMap.clear()
  })

  it("stores pending route into sessionStorage", () => {
    const data: PendingRouteData = {
      gpxContent: "<gpx>...</gpx>",
      fileName: "trail.gpx",
      raceName: "Lombok 50K",
      raceDate: "2026-12-01",
      runnerName: "Budi",
    }

    storePendingRoute(data)
    const stored = sessionStorage.getItem(PENDING_ROUTE_KEY)
    expect(stored).toBeDefined()
    expect(JSON.parse(stored!)).toEqual(data)
  })

  it("clears pending route from sessionStorage", () => {
    sessionStorage.setItem(PENDING_ROUTE_KEY, JSON.stringify({ fileName: "test.gpx" }))
    clearPendingRoute()
    expect(sessionStorage.getItem(PENDING_ROUTE_KEY)).toBeNull()
  })
})
