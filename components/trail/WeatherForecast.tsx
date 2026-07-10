"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { CloudSun, MapPin, Search, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface WeatherForecastProps {
  center: [number, number] // [lat, lon] — route default
  initialDate?: string
}

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

interface GeoResult {
  display_name: string
  lat: string
  lon: string
}

// WMO Weather codes → descriptions
const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
}

// Weather code → emoji
function getWeatherEmoji(code: number): string {
  if (code === 0) return "☀️"
  if (code <= 3) return "⛅"
  if (code <= 48) return "🌫️"
  if (code <= 55) return "🌦️"
  if (code <= 65) return "🌧️"
  if (code <= 77) return "🌨️"
  if (code <= 82) return "🌦️"
  if (code <= 86) return "🌨️"
  return "⛈️"
}

// Wind degree → direction
function degToDirection(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  return dirs[Math.round(deg / 45) % 8]
}

// Format YYYY-MM-DD to "14 April 2026"
function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// Format a Nominatim display_name to Kecamatan, Kabupaten/Kota, Provinsi
function shortName(display_name: string): string {
  const parts = display_name.split(",").map((s) => s.trim())
  if (parts.length >= 4) {
    const relevantParts = parts.slice(
      Math.max(0, parts.length - 6),
      parts.length - 3
    )
    if (relevantParts.length >= 2) {
      return relevantParts.join(", ")
    }
  }
  if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`
  return parts[0]
}

export function WeatherForecast({ center, initialDate }: WeatherForecastProps) {
  const [date, setDate] = useState(initialDate || "")

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate)
    }
  }, [initialDate])

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isPastDateMode, setIsPastDateMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Location state
  const [locationQuery, setLocationQuery] = useState("")
  const [geoResults, setGeoResults] = useState<GeoResult[]>([])
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string
    lat: number
    lon: number
  } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    async function reverseGeocode() {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${center[0].toFixed(5)}&lon=${center[1].toFixed(5)}&zoom=13`
        const res = await fetch(url, { headers: { "Accept-Language": "en" } })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        const name = shortName(data.display_name ?? "")
        setLocationQuery(name)
        setSelectedLocation({ name, lat: center[0], lon: center[1] })
      } catch {
        // silent
      }
    }
    reverseGeocode()
    return () => {
      cancelled = true
    }
  }, [center[0], center[1]])

  const activeLat = selectedLocation?.lat ?? center[0]
  const activeLon = selectedLocation?.lon ?? center[1]
  const activeLocationName = selectedLocation?.name ?? "Route center"

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setGeoResults([])
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      const res = await fetch(url, {
        headers: { "Accept-Language": "en" },
      })
      if (!res.ok) throw new Error("Geocoding failed")
      const data: GeoResult[] = await res.json()
      setGeoResults(data)
      if (data.length === 0) setGeoError("No locations found")
    } catch {
      setGeoError("Could not search location")
    } finally {
      setGeoLoading(false)
    }
  }, [])

  const handleLocationInput = useCallback(
    (value: string) => {
      setLocationQuery(value)
      setGeoResults([])
      setGeoError(null)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => searchLocation(value), 500)
    },
    [searchLocation]
  )

  const handleSelectResult = useCallback((result: GeoResult) => {
    setSelectedLocation({
      name: shortName(result.display_name),
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    })
    setLocationQuery(shortName(result.display_name))
    setGeoResults([])
    setWeather(null)
  }, [])

  const clearLocation = useCallback(() => {
    setSelectedLocation(null)
    setLocationQuery("")
    setGeoResults([])
    setGeoError(null)
    setWeather(null)
  }, [])

  const fetchWeather = useCallback(async () => {
    if (!date) return

    setLoading(true)
    setError(null)
    setWeather(null)

    try {
      const targetDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diffTime = targetDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      const futureHistoricalOnly = diffDays > 14
      const pastDateOnly = diffDays < 0

      setIsPastDateMode(pastDateOnly)

      if (futureHistoricalOnly) {
        throw new Error(
          "Forecasts are only available up to 14 days in advance."
        )
      }

      let forecastData: WeatherData | null = null

      if (pastDateOnly) {
        const historyUrl = new URL(
          "https://archive-api.open-meteo.com/v1/archive"
        )
        historyUrl.searchParams.set("latitude", activeLat.toFixed(4))
        historyUrl.searchParams.set("longitude", activeLon.toFixed(4))
        historyUrl.searchParams.set(
          "daily",
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset,apparent_temperature_max,apparent_temperature_min"
        )
        historyUrl.searchParams.set("hourly", "temperature_2m,weather_code")
        historyUrl.searchParams.set("start_date", date)
        historyUrl.searchParams.set("end_date", date)
        historyUrl.searchParams.set("timezone", "auto")

        const resPast = await fetch(historyUrl.toString())
        if (resPast.ok) {
          const rawPast = await resPast.json()
          if (rawPast.daily && rawPast.daily.time.length > 0) {
            const d = rawPast.daily
            const h = rawPast.hourly
            let periods: WeatherPeriod[] | undefined
            if (h && h.temperature_2m && h.temperature_2m.length >= 24) {
              periods = [
                {
                  name: "Morning",
                  temperature: h.temperature_2m[8],
                  weatherCode: h.weather_code[8],
                },
                {
                  name: "Afternoon",
                  temperature: h.temperature_2m[14],
                  weatherCode: h.weather_code[14],
                },
                {
                  name: "Evening",
                  temperature: h.temperature_2m[19],
                  weatherCode: h.weather_code[19],
                },
                {
                  name: "Night",
                  temperature: h.temperature_2m[23],
                  weatherCode: h.weather_code[23],
                },
              ]
            }

            forecastData = {
              date: d.time[0],
              temperatureMax: d.temperature_2m_max[0],
              temperatureMin: d.temperature_2m_min[0],
              weatherCode: d.weather_code[0],
              weatherDescription: WMO_CODES[d.weather_code[0]] || "Unknown",
              rainProbability: 0,
              precipitation: d.precipitation_sum[0],
              windSpeed: d.wind_speed_10m_max[0],
              windDirection: degToDirection(d.wind_direction_10m_dominant[0]),
              humidity: 0,
              uvIndex: 0,
              feelsLikeMax: d.apparent_temperature_max[0],
              feelsLikeMin: d.apparent_temperature_min[0],
              sunrise: d.sunrise[0]?.split("T")[1] || "",
              sunset: d.sunset[0]?.split("T")[1] || "",
              periods,
            }
          }
        }
      } else {
        const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast")
        forecastUrl.searchParams.set("latitude", activeLat.toFixed(4))
        forecastUrl.searchParams.set("longitude", activeLon.toFixed(4))
        forecastUrl.searchParams.set(
          "daily",
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max,apparent_temperature_max,apparent_temperature_min"
        )
        forecastUrl.searchParams.set(
          "hourly",
          "relative_humidity_2m,temperature_2m,weather_code"
        )
        forecastUrl.searchParams.set("start_date", date)
        forecastUrl.searchParams.set("end_date", date)
        forecastUrl.searchParams.set("timezone", "auto")

        const resForecast = await fetch(forecastUrl.toString())
        if (resForecast.ok) {
          const rawForecast = await resForecast.json()
          if (rawForecast.daily && rawForecast.daily.time.length > 0) {
            const d = rawForecast.daily
            const h = rawForecast.hourly
            const avgHumidity = h?.relative_humidity_2m
              ? Math.round(
                  h.relative_humidity_2m.reduce(
                    (a: number, b: number) => a + b,
                    0
                  ) / h.relative_humidity_2m.length
                )
              : 0

            let periods: WeatherPeriod[] | undefined
            if (h && h.temperature_2m && h.temperature_2m.length >= 24) {
              periods = [
                {
                  name: "Morning",
                  temperature: h.temperature_2m[8],
                  weatherCode: h.weather_code[8],
                },
                {
                  name: "Afternoon",
                  temperature: h.temperature_2m[14],
                  weatherCode: h.weather_code[14],
                },
                {
                  name: "Evening",
                  temperature: h.temperature_2m[19],
                  weatherCode: h.weather_code[19],
                },
                {
                  name: "Night",
                  temperature: h.temperature_2m[23],
                  weatherCode: h.weather_code[23],
                },
              ]
            }

            forecastData = {
              date: d.time[0],
              temperatureMax: d.temperature_2m_max[0],
              temperatureMin: d.temperature_2m_min[0],
              weatherCode: d.weather_code[0],
              weatherDescription: WMO_CODES[d.weather_code[0]] || "Unknown",
              rainProbability: d.precipitation_probability_max?.[0] ?? 0,
              precipitation: d.precipitation_sum[0],
              windSpeed: d.wind_speed_10m_max[0],
              windDirection: degToDirection(d.wind_direction_10m_dominant[0]),
              humidity: avgHumidity,
              uvIndex: d.uv_index_max?.[0] ?? 0,
              feelsLikeMax: d.apparent_temperature_max[0],
              feelsLikeMin: d.apparent_temperature_min[0],
              sunrise: d.sunrise[0]?.split("T")[1] || "",
              sunset: d.sunset[0]?.split("T")[1] || "",
              periods,
            }
          }
        }
      }

      if (!forecastData) {
        throw new Error("No weather data available for this date")
      }
      setWeather(forecastData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch weather")
    } finally {
      setLoading(false)
    }
  }, [date, activeLat, activeLon])

  useEffect(() => {
    if (initialDate && activeLat && activeLon) {
      const t = setTimeout(() => {
        fetchWeather()
      }, 300)
      return () => clearTimeout(t)
    }
  }, [initialDate, activeLat, activeLon])

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <CloudSun className="h-4 w-4 text-[#457B9D]" />
          <h3 className="text-sm font-bold text-[#2D3436]">Weather Forecast</h3>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          Check the weather prediction for your race day
        </p>
      </div>

      {/* Location + date inputs — always visible */}
      <div className="grid lg:grid-cols-2">
        <div className="px-4 pt-3 pb-2">
          <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Location
          </p>
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-all focus-within:border-[#1B4332] focus-within:ring-1 focus-within:ring-[#1B4332]">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => handleLocationInput(e.target.value)}
                placeholder={`${center[0].toFixed(3)}, ${center[1].toFixed(3)} (route center)`}
                className="flex-1 bg-transparent text-sm text-[#2D3436] outline-none placeholder:text-gray-400"
              />
              {geoLoading && (
                <Search className="h-3.5 w-3.5 shrink-0 animate-pulse text-gray-400" />
              )}
              {selectedLocation && !geoLoading && (
                <button
                  onClick={clearLocation}
                  className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5 cursor-pointer" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {geoResults.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                  {geoResults.map((r, i) => (
                    <li key={i}>
                      <button
                        onClick={() => handleSelectResult(r)}
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50"
                      >
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E76F51]" />
                        <span className="line-clamp-2 leading-tight text-[#2D3436]">
                          {r.display_name}
                        </span>
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>

            {geoError && !geoLoading && locationQuery && (
              <p className="mt-1 text-xs text-red-400">{geoError}</p>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1B4332]/8 px-2 py-0.5">
              <MapPin className="h-2.5 w-2.5 text-[#1B4332]" />
              <span className="text-[10px] font-medium text-[#1B4332]">
                {activeLocationName}
              </span>
            </span>
            <span className="text-[10px] text-gray-400">
              {activeLat.toFixed(4)}, {activeLon.toFixed(4)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2D3436] outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
          />
          <button
            onClick={fetchWeather}
            disabled={loading || !date}
            className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1B4332]/5 px-4 py-2 text-sm font-bold text-[#1B4332] transition-all hover:bg-[#1B4332] hover:text-white disabled:opacity-50"
          >
            {loading ? "Checking..." : "Check"}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {isPastDateMode && !error && weather && (
        <div className="mx-4 mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <p className="text-xs leading-relaxed text-blue-800">
            <strong className="font-semibold">Note:</strong> Viewing actual
            historical weather records for {formatDate(weather.date)}.
          </p>
        </div>
      )}

      <AnimatePresence>
        {weather && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Daily Periods */}
            {weather.periods && weather.periods.length > 0 && (
              <div className="mx-4 mb-3 grid grid-cols-4 gap-2">
                {weather.periods.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center rounded-lg border border-gray-100 bg-gray-50 p-2 text-center"
                  >
                    <span className="text-[10px] font-semibold text-gray-500">
                      {p.name}
                    </span>
                    <span
                      className="my-1 text-2xl"
                      title={WMO_CODES[p.weatherCode]}
                    >
                      {getWeatherEmoji(p.weatherCode)}
                    </span>
                    <span className="text-sm font-bold text-[#2D3436]">
                      {Math.round(p.temperature)}°
                    </span>
                    <span className="mt-1 text-[10px] leading-tight text-gray-500">
                      {WMO_CODES[p.weatherCode] || "Unknown"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
