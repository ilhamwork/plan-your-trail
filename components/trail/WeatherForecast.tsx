"use client"

import { memo, useState, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { CloudSun, MapPin, Search, X, Lock, Sparkles, Check, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useEntitlements } from "@/lib/entitlements"
import { fetchWeatherAction } from "@/app/actions/weather"
import type { WeatherData } from "@/lib/weather"
import { trackEvent } from "@/lib/analytics/events"


interface WeatherForecastProps {
  center: [number, number] // [lat, lon] — route default
  initialDate?: string
}

interface GeoResult {
  display_name: string
  lat: string
  lon: string
}

// WMO Weather codes → Indonesian descriptions
const WMO_CODES: Record<number, string> = {
  0: "Cerah",
  1: "Cerah berawan",
  2: "Sebagian berawan",
  3: "Berawan tebal",
  45: "Berkabut",
  48: "Kabut tebal",
  51: "Gerimis ringan",
  53: "Gerimis sedang",
  55: "Gerimis lebat",
  61: "Hujan ringan",
  63: "Hujan sedang",
  65: "Hujan lebat",
  71: "Salju ringan",
  73: "Salju sedang",
  75: "Salju lebat",
  77: "Hujan butiran es",
  80: "Hujan lokal ringan",
  81: "Hujan lokal sedang",
  82: "Hujan lokal lebat",
  85: "Hujan salju ringan",
  86: "Hujan salju lebat",
  95: "Badai petir",
  96: "Badai petir es",
  99: "Badai petir lebat",
}

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

function translatePeriodName(name: string): string {
  switch (name.toLowerCase()) {
    case "morning":
      return "Pagi"
    case "afternoon":
      return "Siang"
    case "evening":
      return "Sore"
    case "night":
      return "Malam"
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
  const [waitlistJoined, setWaitlistJoined] = useState(false)

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
        const res = await fetch(url, { headers: { "Accept-Language": "id" } })
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
  }, [centerLat, centerLon])

  const activeLat = selectedLocation?.lat ?? centerLat
  const activeLon = selectedLocation?.lon ?? centerLon
  const activeLocationName = selectedLocation?.name ?? "Titik Tengah Rute"


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
        headers: { "Accept-Language": "id" },
      })
      if (!res.ok) throw new Error("Pencarian lokasi gagal")
      const data: GeoResult[] = await res.json()
      setGeoResults(data)
      if (data.length === 0) setGeoError("Lokasi tidak ditemukan")
    } catch {
      setGeoError("Gagal mencari lokasi")
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
      setError("Gagal memuat cuaca. Silakan coba lagi.")
    } finally {
      setLoading(false)
    }
  }, [date, activeLat, activeLon, hasWeatherAccess])

  useEffect(() => {
    if (hasWeatherAccess && date && activeLat && activeLon) {
      fetchWeather()
    }
  }, [hasWeatherAccess, date, activeLat, activeLon, fetchWeather])

  const handleJoinWaitlist = () => {
    trackEvent("waitlist_joined", {
      feature: "weather_hourly",
      source: "weather_card",
    })
    setWaitlistJoined(true)
  }

  // If user is Anonymous: show Gated State
  if (!authLoading && !hasWeatherAccess) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudSun className="h-4 w-4 text-[#457B9D]" />
            <h3 className="text-sm font-bold text-[#2D3436]">
              Prakiraan Cuaca Rute
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            <Lock className="h-2.5 w-2.5" />
            Khusus Akun Terdaftar
          </span>
        </div>

        <div className="relative p-6 text-center">
          {/* Blurred background mockup */}
          <div className="pointer-events-none select-none blur-sm opacity-35 filter">
            <div className="grid grid-cols-4 gap-2">
              {["Pagi", "Siang", "Sore", "Malam"].map((p, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center rounded-lg border border-gray-100 bg-gray-50 p-2"
                >
                  <span className="text-[10px] text-gray-400">{p}</span>
                  <span className="my-1 text-2xl">⛅</span>
                  <span className="text-sm font-bold text-gray-600">24°</span>
                  <span className="text-[10px] text-gray-400">Cerah</span>
                </div>
              ))}
            </div>
          </div>

          {/* Overlay Call to Action */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 p-4 backdrop-blur-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1B4332]/10 text-[#1B4332]">
              <Lock className="h-5 w-5" />
            </div>
            <h4 className="mt-2 text-sm font-bold text-gray-900">
              Buka Prakiraan Cuaca Lengkap
            </h4>
            <p className="mt-1 max-w-sm text-xs text-gray-600">
              Daftar dalam 30 detik untuk melihat prakiraan cuaca per sesi
              (Pagi, Siang, Sore, Malam) di lokasi rute.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Link
                href="/register"
                onClick={() =>
                  trackEvent("register_clicked", {
                    source: "weather_card",
                    feature: "weather_session",
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#143326]"
              >
                <span>Daftar Akun</span>
                <ArrowRight className="h-3 w-3" />
              </Link>

              <Link
                href="/login"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Masuk
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <CloudSun className="h-4 w-4 text-[#457B9D]" />
          <h3 className="text-sm font-bold text-[#2D3436]">
            Prakiraan Cuaca Rute
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          Prakiraan cuaca per sesi race day di titik rute
        </p>
      </div>

      <div className="grid lg:grid-cols-2">
        <div className="px-4 pt-3 pb-2">
          <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Lokasi
          </p>
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-all focus-within:border-[#1B4332] focus-within:ring-1 focus-within:ring-[#1B4332]">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => handleLocationInput(e.target.value)}
                placeholder={`${center[0].toFixed(3)}, ${center[1].toFixed(3)} (pusat rute)`}
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
            {loading ? "Memuat..." : "Cek Cuaca"}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 pb-3">
          <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p>
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
                      {translatePeriodName(p.name)}
                    </span>
                    <span
                      className="my-1 text-2xl"
                      title={WMO_CODES[p.weatherCode]}
                    >
                      {getWeatherEmoji(p.weatherCode)}
                    </span>
                    <span className="text-sm font-bold text-[#2D3436]">
                      {Math.round(p.temperature)}°C
                    </span>
                    <span className="mt-1 text-[10px] leading-tight text-gray-500">
                      {WMO_CODES[p.weatherCode] || "Cerah"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Pro Hourly Teaser (PRD 6.1) */}
            <div className="mx-4 mb-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-gray-700">
                    Prakiraan Cuaca Per Jam (Hourly)
                  </span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                    Segera Hadir di Pro
                  </span>
                </div>
                {waitlistJoined ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <Check className="h-3 w-3" />
                    Terdaftar Early Access
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleJoinWaitlist}
                    className="text-xs font-medium text-[#1B4332] underline hover:text-[#143326]"
                  >
                    Daftar Early Access
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})
