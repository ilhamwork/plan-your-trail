import { describe, it, expect } from "vitest"
import { simplifyTrack } from "@/lib/gpx/simplify"
import type { TrackPoint } from "@/lib/types"

describe("lib/gpx/simplify", () => {
  it("returns original array when point count is <= targetMaxPoints", () => {
    const points: TrackPoint[] = [
      { lat: -8.3, lon: 116.4, ele: 1000, distance: 0, gradient: 0 },
      { lat: -8.31, lon: 116.41, ele: 1100, distance: 1500, gradient: 6.6 },
    ]
    expect(simplifyTrack(points, 800)).toEqual(points)
  })

  it("simplifies a dense straight line down to start and end point", () => {
    const points: TrackPoint[] = []
    for (let i = 0; i < 100; i++) {
      points.push({
        lat: -8.0 + i * 0.001,
        lon: 116.0 + i * 0.001,
        ele: 1000 + i * 10,
        distance: i * 150,
        gradient: 5,
      })
    }

    const simplified = simplifyTrack(points, 20)
    expect(simplified.length).toBeLessThan(10)
    expect(simplified[0]).toEqual(points[0])
    expect(simplified[simplified.length - 1]).toEqual(points[points.length - 1])
  })

  it("preserves significant peaks and turns in a zigzag route", () => {
    const points: TrackPoint[] = [
      { lat: 0, lon: 0, ele: 0, distance: 0, gradient: 0 },
      { lat: 0.01, lon: 0, ele: 500, distance: 1000, gradient: 50 },
      { lat: 0.01, lon: 0.01, ele: 1000, distance: 2000, gradient: 50 }, // turn
      { lat: 0.02, lon: 0.01, ele: 1500, distance: 3000, gradient: 50 },
    ]

    const simplified = simplifyTrack(points, 10)
    expect(simplified.length).toBeGreaterThanOrEqual(3)
    expect(simplified[0]).toEqual(points[0])
    expect(simplified[simplified.length - 1]).toEqual(points[points.length - 1])
  })
})
