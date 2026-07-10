import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HourlyEntry {
  hour: string           // "00:00", "01:00", … "23:00"
  temperature: number
  weatherCode: number
  weatherDescription: string
  precipitation: number
  precipitationProbability: number | null
  windSpeed: number
  windDirection: string
  relativeHumidity: number | null
  apparentTemperature: number | null
}

interface HourlyWeatherData {
  date: string
  isPastDate: boolean
  hours: HourlyEntry[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// WMO Weather interpretation codes → descriptions (same set as daily route)
const WMO_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
}

function degToDirection(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

/** Formats an ISO datetime string like "2025-04-14T08:00" → "08:00" */
function isoToHourLabel(isoStr: string): string {
  const t = isoStr.split('T')[1]
  return t ? t.slice(0, 5) : isoStr.slice(11, 16)
}

// ---------------------------------------------------------------------------
// GET /api/weather/hourly
// Returns hourly weather data for a single day.
// Free feature — accessible by all users including anonymous.
//
// Query params:
//   lat   (required) — latitude as float string
//   lng   (required) — longitude as float string
//   date  (required) — YYYY-MM-DD
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // Parse and validate query parameters
  const { searchParams } = new URL(request.url)
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')
  const dateParam = searchParams.get('date')

  if (!latParam || !lngParam) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAMS', message: 'lat and lng are required' } },
      { status: 400 },
    )
  }

  if (!dateParam) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAMS', message: 'date is required (YYYY-MM-DD)' } },
      { status: 400 },
    )
  }

  const lat = parseFloat(latParam)
  const lng = parseFloat(lngParam)

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMS', message: 'lat must be -90..90 and lng must be -180..180' } },
      { status: 400 },
    )
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateParam)) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMS', message: 'date must be YYYY-MM-DD' } },
      { status: 400 },
    )
  }

  // 4. Determine whether the date is past or future
  const today = new Date().toISOString().slice(0, 10)
  const todayDate = new Date(today)
  const targetDate = new Date(dateParam)
  const diffDays = Math.ceil(
    (targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays > 14) {
    return NextResponse.json(
      {
        error: {
          code: 'DATE_OUT_OF_RANGE',
          message: 'Hourly forecasts are only available up to 14 days in advance.',
        },
      },
      { status: 400 },
    )
  }

  const isPastDate = diffDays < 0

  // 5. Proxy Open-Meteo API (free, no API key needed)
  try {
    let hours: HourlyEntry[]

    if (isPastDate) {
      // Historical archive endpoint — hourly granularity
      const url = new URL('https://archive-api.open-meteo.com/v1/archive')
      url.searchParams.set('latitude', lat.toFixed(4))
      url.searchParams.set('longitude', lng.toFixed(4))
      url.searchParams.set(
        'hourly',
        'temperature_2m,weather_code,precipitation,wind_speed_10m,wind_direction_10m,relative_humidity_2m,apparent_temperature',
      )
      url.searchParams.set('start_date', dateParam)
      url.searchParams.set('end_date', dateParam)
      url.searchParams.set('timezone', 'auto')

      const res = await fetch(url.toString())
      if (!res.ok) {
        throw new Error(`Open-Meteo archive returned ${res.status}`)
      }
      const raw = await res.json()

      const h = raw.hourly as {
        time: string[]
        temperature_2m: number[]
        weather_code: number[]
        precipitation: number[]
        wind_speed_10m: number[]
        wind_direction_10m: number[]
        relative_humidity_2m?: number[]
        apparent_temperature?: number[]
      }

      hours = h.time.map((isoTime, i) => ({
        hour: isoToHourLabel(isoTime),
        temperature: h.temperature_2m[i],
        weatherCode: h.weather_code[i],
        weatherDescription: WMO_CODES[h.weather_code[i]] ?? 'Unknown',
        precipitation: h.precipitation[i],
        precipitationProbability: null, // not available in archive
        windSpeed: h.wind_speed_10m[i],
        windDirection: degToDirection(h.wind_direction_10m[i]),
        relativeHumidity: h.relative_humidity_2m?.[i] ?? null,
        apparentTemperature: h.apparent_temperature?.[i] ?? null,
      }))
    } else {
      // Forecast endpoint — hourly granularity
      const url = new URL('https://api.open-meteo.com/v1/forecast')
      url.searchParams.set('latitude', lat.toFixed(4))
      url.searchParams.set('longitude', lng.toFixed(4))
      url.searchParams.set(
        'hourly',
        'temperature_2m,weather_code,precipitation,precipitation_probability,wind_speed_10m,wind_direction_10m,relative_humidity_2m,apparent_temperature',
      )
      url.searchParams.set('start_date', dateParam)
      url.searchParams.set('end_date', dateParam)
      url.searchParams.set('timezone', 'auto')

      const res = await fetch(url.toString())
      if (!res.ok) {
        throw new Error(`Open-Meteo forecast returned ${res.status}`)
      }
      const raw = await res.json()

      const h = raw.hourly as {
        time: string[]
        temperature_2m: number[]
        weather_code: number[]
        precipitation: number[]
        precipitation_probability?: number[]
        wind_speed_10m: number[]
        wind_direction_10m: number[]
        relative_humidity_2m?: number[]
        apparent_temperature?: number[]
      }

      hours = h.time.map((isoTime, i) => ({
        hour: isoToHourLabel(isoTime),
        temperature: h.temperature_2m[i],
        weatherCode: h.weather_code[i],
        weatherDescription: WMO_CODES[h.weather_code[i]] ?? 'Unknown',
        precipitation: h.precipitation[i],
        precipitationProbability: h.precipitation_probability?.[i] ?? null,
        windSpeed: h.wind_speed_10m[i],
        windDirection: degToDirection(h.wind_direction_10m[i]),
        relativeHumidity: h.relative_humidity_2m?.[i] ?? null,
        apparentTemperature: h.apparent_temperature?.[i] ?? null,
      }))
    }

    const result: HourlyWeatherData = {
      date: dateParam,
      isPastDate,
      hours,
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch hourly weather data'
    return NextResponse.json(
      { error: { code: 'WEATHER_FETCH_FAILED', message } },
      { status: 502 },
    )
  }
}
