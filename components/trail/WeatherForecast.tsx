"use client"

import { memo, useState, useCallback, useEffect, useRef } from "react"
import {
  CloudSun,
  Sun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  MapPin,
  Search,
  X,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useEntitlements } from "@/lib/entitlements"
import { useI18n } from "@/lib/i18n/context"
import { fetchWeatherAction } from "@/app/actions/weather"
import type { WeatherData } from "@/lib/weather"


interface WeatherForecastProps {
  center: [number, number] // [lat, lon] — route default
  initialDate?: string
}

interface GeoResult {
  display_name: string
  lat: string
  lon: string
}

// WMO Weather codes → i18n keys
const WMO_KEY_MAP: Record<number, string> = {
  0: "weatherPanel.wmo.c0",
  1: "weatherPanel.wmo.c1",
  2: "weatherPanel.wmo.c2",
  3: "weatherPanel.wmo.c3",
  45: "weatherPanel.wmo.c45",
  48: "weatherPanel.wmo.c48",
  51: "weatherPanel.wmo.c51",
  53: "weatherPanel.wmo.c53",
  55: "weatherPanel.wmo.c55",
  61: "weatherPanel.wmo.c61",
  63: "weatherPanel.wmo.c63",
  65: "weatherPanel.wmo.c65",
  71: "weatherPanel.wmo.c71",
  73: "weatherPanel.wmo.c73",
  75: "weatherPanel.wmo.c75",
  77: "weatherPanel.wmo.c77",
  80: "weatherPanel.wmo.c80",
  81: "weatherPanel.wmo.c81",
  82: "weatherPanel.wmo.c82",
  85: "weatherPanel.wmo.c85",
  86: "weatherPanel.wmo.c86",
  95: "weatherPanel.wmo.c95",
  96: "weatherPanel.wmo.c96",
  99: "weatherPanel.wmo.c99",
}

function WeatherIcon({ code, className = "h-5 w-5" }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} aria-hidden="true" />
  if (code <= 3) return <CloudSun className={className} aria-hidden="true" />
  if (code <= 48) return <CloudFog className={className} aria-hidden="true" />
  if (code <= 55) return <CloudDrizzle className={className} aria-hidden="true" />
  if (code <= 65) return <CloudRain className={className} aria-hidden="true" />
  if (code <= 77) return <CloudSnow className={className} aria-hidden="true" />
  if (code <= 82) return <CloudDrizzle className={className} aria-hidden="true" />
  if (code <= 86) return <CloudSnow className={className} aria-hidden="true" />
  return <CloudLightning className={className} aria-hidden="true" />
}

function getPeriodLabel(name: string, t: (key: string) => string): string {
  switch (name.toLowerCase()) {
    case "morning":
      return t("weather.morning")
    case "afternoon":
      return t("weather.afternoon")
    case "evening":
      return t("weather.evening")
    case "night":
      return t("weather.night")
    default:
      return name
  }
}

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

export const WeatherForecast = memo(function WeatherForecast({
  center,
  initialDate,
}: WeatherForecastProps) {
  const [centerLat, centerLon] = center
  const { can, isLoading: authLoading } = useEntitlements()
  const { t, locale } = useI18n()
  const hasWeatherAccess = can("weather_session")

  const [date, setDate] = useState(
    initialDate || new Date().toISOString().split("T")[0]
  )

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate)
    }
  }, [initialDate])

  const [weather, setWeather] = useState<WeatherData | null>(null)
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
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${centerLat.toFixed(5)}&lon=${centerLon.toFixed(5)}&zoom=13`
        const res = await fetch(url, { headers: { "Accept-Language": locale } })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        const name = shortName(data.display_name ?? "")
        setLocationQuery(name)
        setSelectedLocation({ name, lat: centerLat, lon: centerLon })
      } catch {
        // silent
      }
    }
    reverseGeocode()
    return () => {
      cancelled = true
    }
  }, [centerLat, centerLon, locale])

  const activeLat = selectedLocation?.lat ?? centerLat
  const activeLon = selectedLocation?.lon ?? centerLon
  const activeLocationName = selectedLocation?.name ?? t("weatherPanel.routeCenterName")


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
        headers: { "Accept-Language": locale },
      })
      if (!res.ok) throw new Error(t("weatherPanel.geoSearchFailed"))
      const data: GeoResult[] = await res.json()
      setGeoResults(data)
      if (data.length === 0) setGeoError(t("weatherPanel.geoNotFound"))
    } catch {
      setGeoError(t("weatherPanel.geoError"))
    } finally {
      setGeoLoading(false)
    }
  }, [locale, t])

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
    if (!date || !hasWeatherAccess) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetchWeatherAction({
        lat: activeLat,
        lon: activeLon,
        date,
      })

      if (!res.ok) {
        setError(res.error.message)
        return
      }

      setWeather(res.data)
    } catch {
      setError(t("weatherPanel.loadError"))
    } finally {
      setLoading(false)
    }
  }, [date, activeLat, activeLon, hasWeatherAccess, t])

  useEffect(() => {
    if (hasWeatherAccess && date && activeLat && activeLon) {
      fetchWeather()
    }
  }, [hasWeatherAccess, date, activeLat, activeLon, fetchWeather])

  // If user is Anonymous: show Gated State (Flattened teaser card with 4-session preview)
  if (!authLoading && !hasWeatherAccess) {
    const sampleSessions = [
      { label: t("weather.morning"), temp: "14°", icon: Sun },
      { label: t("weather.afternoon"), temp: "21°", icon: CloudSun },
      { label: t("weather.evening"), temp: "16°", icon: CloudRain },
      { label: t("weather.night"), temp: "11°", icon: CloudFog },
    ]
    return (
      <section
        aria-label={t("weather.lockedTitle")}
        className="rounded-2xl border border-[#E5E7EB] bg-white p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF6F1] text-[#1B4332]">
            <CloudSun className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold leading-snug tracking-tight text-[#111827]">
              {t("weather.lockedTitle")}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#4B5563]">
              {t("authWall.weatherDesc")}
            </p>
          </div>
        </div>

        {/* Illustrative 4-session weather preview (<= 80px) */}
        <div
          aria-hidden="true"
          className="mt-3.5 flex max-h-20 items-center justify-between gap-2 rounded-xl border border-[#E5E7EB]/80 bg-[#FAF6F1]/70 px-3 py-2"
        >
          <div className="grid flex-1 grid-cols-4 gap-1.5">
            {sampleSessions.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center rounded-lg bg-white px-1.5 py-1 ring-1 ring-[#E5E7EB]"
              >
                <span className="text-[10px] font-medium text-[#4B5563]">
                  {s.label}
                </span>
                <div className="mt-0.5 flex items-center gap-1">
                  <s.icon className="h-3 w-3 text-[#1B4332]" />
                  <span className="text-[11px] font-bold text-[#111827] tabular-nums">
                    {s.temp}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <span className="shrink-0 rounded-full bg-[#1B4332]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1B4332]">
            {t("authWall.exampleBadge")}
          </span>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label={t("weatherPanel.title")}
      className="border-t border-[#D1D5DB] pt-8"
    >
      <div>
        <h3 className="text-xl font-bold tracking-tight text-[#111827]">
          {t("weatherPanel.title")}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-[#4B5563]">
          {t("weatherPanel.subtitle")}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className="min-w-0">
          <label
            htmlFor="weather-location-input"
            className="mb-1.5 block text-xs font-semibold text-[#4B5563]"
          >
            {t("weatherPanel.locationLabel")}
          </label>
          <div className="relative">
            <div className="flex min-h-11 items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-2 transition focus-within:border-[#1B4332] focus-within:ring-1 focus-within:ring-[#1B4332]">
              <MapPin className="h-4 w-4 shrink-0 text-[#4B5563]" />
              <input
                id="weather-location-input"
                type="text"
                value={locationQuery}
                onChange={(e) => handleLocationInput(e.target.value)}
                placeholder={t("weatherPanel.centerPlaceholder", {
                  lat: center[0].toFixed(3),
                  lon: center[1].toFixed(3),
                })}
                className="min-w-0 flex-1 bg-transparent text-sm text-[#2D3436] outline-none placeholder:text-[#525B66]"
              />
              {geoLoading && (
                <Search className="h-4 w-4 shrink-0 animate-pulse text-[#4B5563]" />
              )}
              {selectedLocation && !geoLoading && (
                <button
                  type="button"
                  onClick={clearLocation}
                  aria-label={t("weatherPanel.clearLocationAria")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#4B5563] transition hover:bg-[#FAF6F1] hover:text-[#2D3436] focus-visible:outline-2 focus-visible:outline-[#1B4332]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {geoResults.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg"
                >
                  {geoResults.map((r, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => handleSelectResult(r)}
                        className="flex min-h-11 w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-[#FAF6F1] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1B4332]"
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#E76F51]" />
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
              <p role="alert" className="mt-1.5 text-xs font-medium text-[#B91C1C]">
                {geoError}
              </p>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F1EDE8] px-2.5 py-0.5 text-xs font-semibold text-[#1B4332]">
              <MapPin className="h-3 w-3 text-[#1B4332]" />
              <span>{activeLocationName}</span>
            </span>
            <span className="text-xs text-[#4B5563] tabular-nums">
              {activeLat.toFixed(4)}, {activeLon.toFixed(4)}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="weather-date-input"
            className="mb-1.5 block text-xs font-semibold text-[#4B5563]"
          >
            {t("weatherPanel.dateLabel")}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="weather-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#D1D5DB] bg-white px-3.5 py-2 text-sm text-[#2D3436] focus:border-[#1B4332] focus-visible:outline-2 focus-visible:outline-[#1B4332]"
            />
            <button
              type="button"
              onClick={fetchWeather}
              disabled={loading || !date}
              className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-xl bg-[#1B4332] px-4 py-2.5 text-xs font-semibold text-[#FAF6F1] transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] disabled:opacity-50"
            >
              {loading ? t("weatherPanel.loadingBtn") : t("weatherPanel.checkBtn")}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-[#B91C1C]">
          {error}
        </div>
      )}

      {loading && !weather && !error && (
        <p className="mt-4 text-sm text-[#4B5563]">
          {t("weatherPanel.loadingFor", { location: activeLocationName })}
        </p>
      )}

      <AnimatePresence>
        {weather && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            {/* Single-row session weather list matching MetricsPanel style */}
            {weather.periods && weather.periods.length > 0 && (
              <ul className="divide-y divide-[#E5E7EB]">
                {weather.periods.map((p, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <WeatherIcon
                        code={p.weatherCode}
                        className="h-5 w-5 shrink-0 text-[#2D3436]"
                      />
                      <span className="text-[15px] font-medium text-[#2D3436]">
                        {getPeriodLabel(p.name, t)}
                      </span>
                      <span className="truncate text-sm text-[#4B5563]">
                        {WMO_KEY_MAP[p.weatherCode]
                          ? t(WMO_KEY_MAP[p.weatherCode])
                          : t("weatherPanel.clearDefault")}
                      </span>
                    </div>

                    <span className="shrink-0 text-base font-bold text-[#2D3436] tabular-nums">
                      {Math.round(p.temperature)}°C
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
})
