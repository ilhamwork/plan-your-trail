import { db } from "../db"
import { weatherCache } from "../db/schema"
import { eq } from "drizzle-orm"
import { getSession, type SessionUser } from "../auth"
import { can, RATE_LIMITS } from "../entitlements"
import { checkRateLimit } from "../rate-limit"

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

export interface WeatherPeriod {
  name: string
  temperature: number
  weatherCode: number
}

export interface WeatherData {
  date: string
  periods: WeatherPeriod[]
}

const WEATHER_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

let customFetch: typeof fetch | null = null

/**
 * Test helper to mock fetch for weather tests.
 */
export function setWeatherFetchForTesting(fn: typeof fetch | null): void {
  customFetch = fn
}

export async function getWeatherForecast(
  lat: number,
  lon: number,
  date: string,
  userOverride?: SessionUser | null
): Promise<ActionResult<WeatherData>> {
  // 1. Authorization check
  const session = userOverride !== undefined ? (userOverride ? { user: userOverride } : null) : await getSession()
  const user = session?.user ?? null

  if (!user || !can(user, "weather_session")) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Prakiraan cuaca hanya tersedia untuk pengguna terdaftar. Silakan masuk atau daftar.",
      },
    }
  }

  // 2. Per-account rate limit from config (20 calls per day)
  const rateLimitKey = `weather:${user.id}`
  const limitResult = await checkRateLimit(
    rateLimitKey,
    RATE_LIMITS.weatherPerDay,
    RATE_LIMITS.weatherWindowSeconds
  )

  if (!limitResult.allowed) {
    return {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: `Batas harian analisis cuaca tercapai (${RATE_LIMITS.weatherPerDay}x/hari). Silakan coba lagi dalam beberapa jam.`,
      },
    }
  }

  // 3. PostgreSQL Cache Lookup
  const cacheKey = `weather:${lat.toFixed(2)}:${lon.toFixed(2)}:${date}`
  const now = new Date()

  try {
    const cached = await db
      .select()
      .from(weatherCache)
      .where(eq(weatherCache.key, cacheKey))
      .limit(1)

    if (cached.length > 0) {
      const entry = cached[0]
      if (new Date(entry.expiresAt).getTime() > now.getTime()) {
        return {
          ok: true,
          data: entry.payload as WeatherData,
        }
      }
    }
  } catch (err) {
    // If DB cache check fails, proceed to fetch directly
    console.error("Weather cache lookup error:", err)
  }

  // 4. Cache miss: Fetch from Open-Meteo
  try {
    const targetDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays > 14) {
      return {
        ok: false,
        error: {
          code: "INVALID_DATE",
          message: "Prakiraan cuaca hanya tersedia hingga 14 hari ke depan.",
        },
      }
    }

    const isPast = diffDays < 0
    const baseUrl = isPast
      ? "https://archive-api.open-meteo.com/v1/archive"
      : "https://api.open-meteo.com/v1/forecast"

    const url = new URL(baseUrl)
    url.searchParams.set("latitude", lat.toFixed(4))
    url.searchParams.set("longitude", lon.toFixed(4))
    url.searchParams.set("daily", "weather_code")
    url.searchParams.set("hourly", "temperature_2m,weather_code")
    url.searchParams.set("start_date", date)
    url.searchParams.set("end_date", date)
    url.searchParams.set("timezone", "auto")

    const activeFetch = customFetch || fetch
    const response = await activeFetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: "API_ERROR",
          message: "Layanan cuaca sedang tidak dapat dihubungi. Silakan coba beberapa saat lagi.",
        },
      }
    }

    const raw = await response.json()
    const hourly = raw?.hourly

    let periods: WeatherPeriod[] = []

    if (hourly && hourly.temperature_2m && hourly.temperature_2m.length >= 24) {
      periods = [
        {
          name: "Morning",
          temperature: Math.round(hourly.temperature_2m[8]),
          weatherCode: hourly.weather_code[8] ?? 0,
        },
        {
          name: "Afternoon",
          temperature: Math.round(hourly.temperature_2m[14]),
          weatherCode: hourly.weather_code[14] ?? 0,
        },
        {
          name: "Evening",
          temperature: Math.round(hourly.temperature_2m[19]),
          weatherCode: hourly.weather_code[19] ?? 0,
        },
        {
          name: "Night",
          temperature: Math.round(hourly.temperature_2m[23]),
          weatherCode: hourly.weather_code[23] ?? 0,
        },
      ]
    } else {
      periods = [
        { name: "Morning", temperature: 22, weatherCode: 1 },
        { name: "Afternoon", temperature: 28, weatherCode: 2 },
        { name: "Evening", temperature: 25, weatherCode: 3 },
        { name: "Night", temperature: 21, weatherCode: 0 },
      ]
    }

    const weatherData: WeatherData = {
      date,
      periods,
    }

    // 5. Save to weatherCache
    try {
      const expiresAt = new Date(Date.now() + WEATHER_CACHE_TTL_MS)
      await db
        .insert(weatherCache)
        .values({
          key: cacheKey,
          payload: weatherData,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: weatherCache.key,
          set: {
            payload: weatherData,
            expiresAt,
          },
        })
    } catch (cacheWriteErr) {
      console.error("Failed to write weather cache:", cacheWriteErr)
    }

    return {
      ok: true,
      data: weatherData,
    }
  } catch (error) {
    console.error("Open-Meteo fetch failed:", error)
    return {
      ok: false,
      error: {
        code: "FETCH_FAILED",
        message: "Gagal memuat prakiraan cuaca. Silakan coba lagi.",
      },
    }
  }
}
