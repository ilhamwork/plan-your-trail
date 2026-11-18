import { describe, it, expect } from "vitest"
import {
  calculateFinishTime,
  calculateRequiredPace,
} from "@/components/trail/PaceEstimator"

describe("E5-T3: Basic Pace Estimator", () => {
  it("calculates flat finish time correctly without km effort", () => {
    // 10 km at 6:00 min/km = 60 minutes = 1 hour 0 min
    const result = calculateFinishTime(10, 0, 6, 0, false)
    expect(result.hours).toBe(1)
    expect(result.minutes).toBe(0)
    expect(result.totalMinutes).toBe(60)
  })

  it("calculates finish time factoring in elevation gain (km effort)", () => {
    // 10 km with 500m elevation gain:
    // effective distance = 10 + 500 * 0.01 = 15 km effort
    // pace = 6:00 min/km -> 15 * 6 = 90 minutes = 1 hour 30 min
    const result = calculateFinishTime(10, 500, 6, 0, true)
    expect(result.hours).toBe(1)
    expect(result.minutes).toBe(30)
    expect(result.totalMinutes).toBe(90)
  })

  it("handles pace with seconds accurately", () => {
    // 20 km at 7:30 min/km (7.5 min/km):
    // 20 * 7.5 = 150 minutes = 2 hours 30 min
    const result = calculateFinishTime(20, 0, 7, 30, false)
    expect(result.hours).toBe(2)
    expect(result.minutes).toBe(30)
    expect(result.totalMinutes).toBe(150)
  })

  it("rounds minutes cleanly for ultra distances", () => {
    // 50 km with 2500m elevation gain at 8:15 min/km (8.25 min/km):
    // effective distance = 50 + 25 = 75 km effort
    // totalMinutes = 75 * 8.25 = 618.75 -> 619 minutes = 10 hours 19 min
    const result = calculateFinishTime(50, 2500, 8, 15, true)
    expect(result.hours).toBe(10)
    expect(result.minutes).toBe(19)
    expect(result.totalMinutes).toBe(619)
  })

  it("calculates required pace from target finish time with km effort", () => {
    // 10 km with 500m elevation gain = 15 km effort
    // Target: 1 hour 30 min (90 min) -> 90 / 15 = 6:00 /km
    const result = calculateRequiredPace(10, 500, 1, 30, true)
    expect(result.paceMin).toBe(6)
    expect(result.paceSec).toBe(0)
  })

  it("calculates required pace with fractional seconds cleanly", () => {
    // 20 km flat, target 2 hours 30 min (150 min) -> 150 / 20 = 7:30 /km
    const result = calculateRequiredPace(20, 0, 2, 30, false)
    expect(result.paceMin).toBe(7)
    expect(result.paceSec).toBe(30)
  })

  it("returns zero pace when distance or target time is zero", () => {
    expect(calculateRequiredPace(0, 0, 2, 0, true)).toEqual({
      paceMin: 0,
      paceSec: 0,
      totalPaceMinutes: 0,
    })
    expect(calculateRequiredPace(10, 0, 0, 0, true)).toEqual({
      paceMin: 0,
      paceSec: 0,
      totalPaceMinutes: 0,
    })
  })
})
