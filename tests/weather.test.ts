import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getWeatherForecast,
  setWeatherFetchForTesting,
} from "@/lib/weather"
import { fetchWeatherAction } from "@/app/actions/weather"
import { setDbForTesting } from "@/lib/db/client"
import { setSessionForTesting } from "@/lib/auth"

describe("E5-T1: Weather Service, Caching, and Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setWeatherFetchForTesting(null)
    setSessionForTesting(null)
    setDbForTesting(null)
  })

  it("rejects anonymous user with UNAUTHORIZED", async () => {
    setSessionForTesting(null)

    const result = await getWeatherForecast(-7.25, 110.4, "2026-10-30")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHORIZED")
    }
  })

  it("serves from weather_cache when cache is valid and unexpired", async () => {
    const mockUser = {
      id: "usr-weather-1",
      email: "trail@example.com",
      plan: "free" as const,
    }
    setSessionForTesting({ user: mockUser })

    const cachedPayload = {
      date: "2026-10-30",
      periods: [
        { name: "Morning", temperature: 20, weatherCode: 1 },
        { name: "Afternoon", temperature: 26, weatherCode: 2 },
        { name: "Evening", temperature: 23, weatherCode: 3 },
        { name: "Night", temperature: 19, weatherCode: 0 },
      ],
    }

    // Mock DB select returning cached row
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              key: "weather:-7.25:110.40:2026-10-30",
              payload: cachedPayload,
              expiresAt: new Date(Date.now() + 3600 * 1000), // expires in 1h
            },
          ]),
        }),
      }),
    })

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    })

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue({}),
      }),
    })

    setDbForTesting({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    } as unknown as Parameters<typeof setDbForTesting>[0])


    const fetchSpy = vi.fn()
    setWeatherFetchForTesting(fetchSpy as unknown as typeof fetch)

    const result = await getWeatherForecast(-7.25, 110.4, "2026-10-30")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(cachedPayload)
    }
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("fetches Open-Meteo on cache miss and parses 4 periods", async () => {
    const mockUser = {
      id: "usr-weather-2",
      email: "trail2@example.com",
      plan: "free" as const,
    }
    setSessionForTesting({ user: mockUser })

    // Mock empty cache
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue({}),
      }),
    })

    setDbForTesting({
      select: mockSelect,
      insert: mockInsert,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    // Mock Open-Meteo response
    const mockHourlyTemps = new Array(24).fill(25)
    mockHourlyTemps[8] = 21
    mockHourlyTemps[14] = 29
    mockHourlyTemps[19] = 24
    mockHourlyTemps[23] = 20

    const mockHourlyCodes = new Array(24).fill(1)
    mockHourlyCodes[8] = 0
    mockHourlyCodes[14] = 2
    mockHourlyCodes[19] = 3
    mockHourlyCodes[23] = 0

    const mockResponse = {
      ok: true,
      json: async () => ({
        hourly: {
          temperature_2m: mockHourlyTemps,
          weather_code: mockHourlyCodes,
        },
      }),
    }

    const mockFetch = vi.fn().mockResolvedValue(mockResponse)
    setWeatherFetchForTesting(mockFetch as unknown as typeof fetch)

    const todayStr = new Date().toISOString().split("T")[0]
    const result = await getWeatherForecast(-7.25, 110.4, todayStr)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.periods).toHaveLength(4)
      expect(result.data.periods[0].name).toBe("Morning")
      expect(result.data.periods[0].temperature).toBe(21)
      expect(result.data.periods[1].name).toBe("Afternoon")
      expect(result.data.periods[1].temperature).toBe(29)
    }
    expect(mockFetch).toHaveBeenCalled()
  })

  it("fetchWeatherAction validates input with Zod", async () => {
    // Invalid latitude (> 90)
    const res1 = await fetchWeatherAction({
      lat: 95,
      lon: 110.4,
      date: "2026-10-30",
    })
    expect(res1.ok).toBe(false)
    if (!res1.ok) {
      expect(res1.error.code).toBe("VALIDATION_ERROR")
    }

    // Invalid date format
    const res2 = await fetchWeatherAction({
      lat: -7.25,
      lon: 110.4,
      date: "30-10-2026",
    })
    expect(res2.ok).toBe(false)
    if (!res2.ok) {
      expect(res2.error.code).toBe("VALIDATION_ERROR")
    }
  })
})
