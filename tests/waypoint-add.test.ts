import { describe, it, expect } from "vitest"
import { computeGPXData } from "@/lib/gpx/compute"
import { generateUUID } from "@/lib/utils"
import type { ExtractedGPX } from "@/lib/gpx/types"

describe("Waypoint Management & Quota", () => {
  it("safe generateUUID generates a valid 36-char UUID even without crypto.randomUUID", () => {
    const id = generateUUID()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it("marks GPX waypoints with isFromGpx: true so they do not count against custom quota", () => {
    const mockExtracted: ExtractedGPX = {
      lines: [
        [
          { lat: -8.34, lon: 116.45, ele: 1000 },
          { lat: -8.35, lon: 116.46, ele: 1100 },
          { lat: -8.36, lon: 116.47, ele: 1200 },
          { lat: -8.37, lon: 116.48, ele: 1300 },
        ],
      ],
      waypoints: [
        { name: "Sembalun", lat: -8.34, lon: 116.45, ele: 1000 },
        { name: "Pos 1", lat: -8.35, lon: 116.46, ele: 1100 },
        { name: "Pos 2", lat: -8.36, lon: 116.47, ele: 1200 },
        { name: "Pos 3", lat: -8.37, lon: 116.48, ele: 1300 },
      ],
    }

    const computed = computeGPXData(mockExtracted)
    expect(computed.waypoints.length).toBeGreaterThanOrEqual(4)

    // All GPX waypoints must have isFromGpx = true
    for (const wp of computed.waypoints) {
      expect(wp.isFromGpx).toBe(true)
    }

    // Custom waypoints count should be 0 because all 4 are from GPX
    const customCount = computed.waypoints.filter((wp) => wp.isFromGpx === false).length
    expect(customCount).toBe(0)
  })
})
