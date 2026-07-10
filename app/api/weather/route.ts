import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeatherPeriod {
  name: string
  temperature: number
  weatherCode: number
}

interface WeatherData {
  date: string
  temperatureMax: number
  temperatureMin: number
  weatherCode: number
  weatherDescription: string
  rainProbability: number
  precipitation: number
  windSpeed: number
  windDirection: string
  humidity: number
  uvIndex: number
  feelsLikeMax: number
  feelsLikeMin: number
  sunrise: string
  sunset: string
  periods?: WeatherPeriod[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// WMO Weather interpretation codes → descriptions
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

/**
 * Extracts four named time-of-day snapshots from hourly arrays.
 * Indices: Morning=8, Afternoon=14, Evening=19, Night=23
 */
function buildPeriods(
  temperatures: number[],
  weatherCodes: number[],
): WeatherPeriod[] | undefined {
  if (!temperatures || temperatures.length < 24) return undefined
  const slots = [
    { name: 'Morning', idx: 8 },
    { name: 'Afternoon', idx: 14 },
    { name: 'Evening', idx: 19 },
    { name: 'Night', idx: 23 },
  ]
  return slots.map(({ name, idx }) => ({
    name,
    temperature: temperatures[idx],
    weatherCode: weatherCodes[idx],
  }))
}

// ---------------------------------------------------------------------------
// GET /api/weather
// Returns daily weather forecast (or historical data) for a given lat/lng + date range.
// Free feature — accessible by all users including anonymous.
//
// Query params:
//   lat        (required) — latitude as float string
//   lng        (required) — longitude as float string
//   startDate  (optional) — YYYY-MM-DD, defaults to today
//   endDate    (optional) — YYYY-MM-DD, defaults to startDate
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // Parse and validate query parameters
  const { searchParams } = new URL(request.url)
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')

  if (!latParam || !lngParam) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAMS', message: 'lat and lng are required' } },
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

  const today = new Date().toISOString().slice(0, 10)
  const startDate = startDateParam ?? today
  const endDate = endDateParam ?? startDate

  // Basic YYYY-MM-DD format validation
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMS', message: 'startDate and endDate must be YYYY-MM-DD' } },
      { status: 400 },
    )
  }

  if (startDate > endDate) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMS', message: 'startDate must be on or before endDate' } },
      { status: 400 },
    )
  }

  // 4. Determine whether the range is past or future (same logic as WeatherForecast.tsx)
  const todayDate = new Date(today)
  const startDateObj = new Date(startDate)
  const diffDays = Math.ceil(
    (startDateObj.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays > 14) {
    return NextResponse.json(
      {
        error: {
          code: 'DATE_OUT_OF_RANGE',
          message: 'Forecasts are only available up to 14 days in advance.',
        },
      },
      { status: 400 },
    )
  }

  const isPastDate = diffDays < 0

  // 5. Proxy Open-Meteo API (free, no API key needed)
  try {
    let days: WeatherData[]

    if (isPastDate) {
      // Historical archive endpoint
      const url = new URL('https://archive-api.open-meteo.com/v1/archive')
      url.searchParams.set('latitude', lat.toFixed(4))
      url.searchParams.set('longitude', lng.toFixed(4))
      url.searchParams.set(
        'daily',
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset,apparent_temperature_max,apparent_temperature_min',
      )
      url.searchParams.set('hourly', 'temperature_2m,weather_code')
      url.searchParams.set('start_date', startDate)
      url.searchParams.set('end_date', endDate)
      url.searchParams.set('timezone', 'auto')

      const res = await fetch(url.toString())
      if (!res.ok) {
        throw new Error(`Open-Meteo archive returned ${res.status}`)
      }
      const raw = await res.json()

      const d = raw.daily as {
        time: string[]
        weather_code: number[]
        temperature_2m_max: number[]
        temperature_2m_min: number[]
        precipitation_sum: number[]
        wind_speed_10m_max: number[]
        wind_direction_10m_dominant: number[]
        sunrise: string[]
        sunset: string[]
        apparent_temperature_max: number[]
        apparent_temperature_min: number[]
      }
      const h = raw.hourly as {
        temperature_2m?: number[]
        weather_code?: number[]
      }

      days = d.time.map((date, i) => {
        // Hourly arrays cover all days sequentially; slice the 24 values for this day
        const hourOffset = i * 24
        const temps = h?.temperature_2m?.slice(hourOffset, hourOffset + 24) ?? []
        const codes = h?.weather_code?.slice(hourOffset, hourOffset + 24) ?? []

        return {
          date,
          temperatureMax: d.temperature_2m_max[i],
          temperatureMin: d.temperature_2m_min[i],
          weatherCode: d.weather_code[i],
          weatherDescription: WMO_CODES[d.weather_code[i]] ?? 'Unknown',
          rainProbability: 0, // not available in archive
          precipitation: d.precipitation_sum[i],
          windSpeed: d.wind_speed_10m_max[i],
          windDirection: degToDirection(d.wind_direction_10m_dominant[i]),
          humidity: 0, // not available in archive
          uvIndex: 0, // not available in archive
          feelsLikeMax: d.apparent_temperature_max[i],
          feelsLikeMin: d.apparent_temperature_min[i],
          sunrise: d.sunrise[i]?.split('T')[1] ?? '',
          sunset: d.sunset[i]?.split('T')[1] ?? '',
          periods: buildPeriods(temps, codes),
        }
      })
    } else {
      // Forecast endpoint
      const url = new URL('https://api.open-meteo.com/v1/forecast')
      url.searchParams.set('latitude', lat.toFixed(4))
      url.searchParams.set('longitude', lng.toFixed(4))
      url.searchParams.set(
        'daily',
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max,apparent_temperature_max,apparent_temperature_min',
      )
      url.searchParams.set('hourly', 'relative_humidity_2m,temperature_2m,weather_code')
      url.searchParams.set('start_date', startDate)
      url.searchParams.set('end_date', endDate)
      url.searchParams.set('timezone', 'auto')

      const res = await fetch(url.toString())
      if (!res.ok) {
        throw new Error(`Open-Meteo forecast returned ${res.status}`)
      }
      const raw = await res.json()

      const d = raw.daily as {
        time: string[]
        weather_code: number[]
        temperature_2m_max: number[]
        temperature_2m_min: number[]
        precipitation_sum: number[]
        precipitation_probability_max?: number[]
        wind_speed_10m_max: number[]
        wind_direction_10m_dominant: number[]
        sunrise: string[]
        sunset: string[]
        uv_index_max?: number[]
        apparent_temperature_max: number[]
        apparent_temperature_min: number[]
      }
      const h = raw.hourly as {
        relative_humidity_2m?: number[]
        temperature_2m?: number[]
        weather_code?: number[]
      }

      days = d.time.map((date, i) => {
        // Hourly arrays cover all days sequentially; slice the 24 values for this day
        const hourOffset = i * 24
        const temps = h?.temperature_2m?.slice(hourOffset, hourOffset + 24) ?? []
        const codes = h?.weather_code?.slice(hourOffset, hourOffset + 24) ?? []
        const humidity = h?.relative_humidity_2m?.slice(hourOffset, hourOffset + 24) ?? []
        const avgHumidity =
          humidity.length > 0
            ? Math.round(humidity.reduce((a, b) => a + b, 0) / humidity.length)
            : 0

        return {
          date,
          temperatureMax: d.temperature_2m_max[i],
          temperatureMin: d.temperature_2m_min[i],
          weatherCode: d.weather_code[i],
          weatherDescription: WMO_CODES[d.weather_code[i]] ?? 'Unknown',
          rainProbability: d.precipitation_probability_max?.[i] ?? 0,
          precipitation: d.precipitation_sum[i],
          windSpeed: d.wind_speed_10m_max[i],
          windDirection: degToDirection(d.wind_direction_10m_dominant[i]),
          humidity: avgHumidity,
          uvIndex: d.uv_index_max?.[i] ?? 0,
          feelsLikeMax: d.apparent_temperature_max[i],
          feelsLikeMin: d.apparent_temperature_min[i],
          sunrise: d.sunrise[i]?.split('T')[1] ?? '',
          sunset: d.sunset[i]?.split('T')[1] ?? '',
          periods: buildPeriods(temps, codes),
        }
      })
    }

    return NextResponse.json({ days, isPastDate })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch weather data'
    return NextResponse.json(
      { error: { code: 'WEATHER_FETCH_FAILED', message } },
      { status: 502 },
    )
  }
}
