"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CloudSun, Droplets, Wind, Thermometer, Sun, Eye, MapPin, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WeatherForecastProps {
  center: [number, number]; // [lat, lon] — route default
  initialDate?: string;
}

interface WeatherData {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  weatherDescription: string;
  rainProbability: number;
  precipitation: number;
  windSpeed: number;
  windDirection: string;
  humidity: number;
  uvIndex: number;
  feelsLikeMax: number;
  feelsLikeMin: number;
  sunrise: string;
  sunset: string;
}

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
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
};

// Weather code → emoji
function getWeatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

// Wind degree → direction
function degToDirection(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

// Format a Nominatim display_name to Kecamatan, Kabupaten/Kota, Provinsi
function shortName(display_name: string): string {
  const parts = display_name.split(",").map((s) => s.trim());
  
  // Format target: Kecamatan (suburb/village), Kabupaten/Kota (city/county), Provinsi (state/region)
  // Nominatim display_name format in Indonesia usually:
  // [Village/Neighbourhood], [Kecamatan], [Kabupaten/Kota], [Provinsi], [Postcode], [Negara]
  // We want to extract the 3 parts before the postcode/country if possible.
  
  if (parts.length >= 4) {
    // Usually the last two are Postcode and Country.
    // The three before that are usually Kecamatan, City/Regency, Province
    const relevantParts = parts.slice(Math.max(0, parts.length - 6), parts.length - 3);
    // If we have at least 2 relevant parts, return them
    if (relevantParts.length >= 2) {
      return relevantParts.join(", ");
    }
  }
  
  // Fallback to the first 2 parts if it's too short
  if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
  return parts[0];
}

export function WeatherForecast({ center, initialDate }: WeatherForecastProps) {
  const [date, setDate] = useState(initialDate || "");
  
  // Update date if initialDate prop changes
  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Location state
  const [locationQuery, setLocationQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    lat: number;
    lon: number;
  } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto reverse-geocode the GPX center on mount
  useEffect(() => {
    let cancelled = false;
    async function reverseGeocode() {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${center[0].toFixed(5)}&lon=${center[1].toFixed(5)}&zoom=13`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        const name = shortName(data.display_name ?? "");
        setLocationQuery(name);
        setSelectedLocation({ name, lat: center[0], lon: center[1] });
      } catch {
        // silent — fall back to coords
      }
    }
    reverseGeocode();
    return () => { cancelled = true; };
  // Only run when the GPX file changes (center changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  // Active coords: use selected location or fall back to route center
  const activeLat = selectedLocation?.lat ?? center[0];
  const activeLon = selectedLocation?.lon ?? center[1];
  const activeLocationName = selectedLocation?.name ?? "Route center";

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setGeoResults([]);
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "en" },
      });
      if (!res.ok) throw new Error("Geocoding failed");
      const data: GeoResult[] = await res.json();
      setGeoResults(data);
      if (data.length === 0) setGeoError("No locations found");
    } catch {
      setGeoError("Could not search location");
    } finally {
      setGeoLoading(false);
    }
  }, []);

  const handleLocationInput = useCallback(
    (value: string) => {
      setLocationQuery(value);
      setGeoResults([]);
      setGeoError(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchLocation(value), 500);
    },
    [searchLocation]
  );

  const handleSelectResult = useCallback((result: GeoResult) => {
    setSelectedLocation({
      name: shortName(result.display_name),
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    });
    setLocationQuery(shortName(result.display_name));
    setGeoResults([]);
    setWeather(null);
  }, []);

  const clearLocation = useCallback(() => {
    setSelectedLocation(null);
    setLocationQuery("");
    setGeoResults([]);
    setGeoError(null);
    setWeather(null);
  }, []);

  const fetchWeather = useCallback(async () => {
    if (!date) return;

    setLoading(true);
    setError(null);

    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", activeLat.toFixed(4));
      url.searchParams.set("longitude", activeLon.toFixed(4));
      url.searchParams.set(
        "daily",
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max,apparent_temperature_max,apparent_temperature_min"
      );
      url.searchParams.set("hourly", "relative_humidity_2m");
      url.searchParams.set("start_date", date);
      url.searchParams.set("end_date", date);
      url.searchParams.set("timezone", "auto");

      // Small delay to ensure activeLat/activeLon correctly resolve if they depend on nominatim
      await new Promise(r => setTimeout(r, 100));

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch weather data");

      const data = await res.json();

      if (!data.daily || data.daily.time.length === 0) {
        throw new Error("No weather data available for this date");
      }

      const d = data.daily;
      const avgHumidity = data.hourly?.relative_humidity_2m
        ? Math.round(
            data.hourly.relative_humidity_2m.reduce(
              (a: number, b: number) => a + b,
              0
            ) / data.hourly.relative_humidity_2m.length
          )
        : 0;

      setWeather({
        date: d.time[0],
        temperatureMax: d.temperature_2m_max[0],
        temperatureMin: d.temperature_2m_min[0],
        weatherCode: d.weather_code[0],
        weatherDescription: WMO_CODES[d.weather_code[0]] || "Unknown",
        rainProbability: d.precipitation_probability_max[0],
        precipitation: d.precipitation_sum[0],
        windSpeed: d.wind_speed_10m_max[0],
        windDirection: degToDirection(d.wind_direction_10m_dominant[0]),
        humidity: avgHumidity,
        uvIndex: d.uv_index_max[0],
        feelsLikeMax: d.apparent_temperature_max[0],
        feelsLikeMin: d.apparent_temperature_min[0],
        sunrise: d.sunrise[0]?.split("T")[1] || "",
        sunset: d.sunset[0]?.split("T")[1] || "",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch weather"
      );
    } finally {
      setLoading(false);
    }
  }, [date, activeLat, activeLon]);

  // Auto fetch weather strictly once when initialDate is injected via form submission.
  useEffect(() => {
    if (initialDate && activeLat && activeLon) {
      // Small timeout to allow state to settle
      const t = setTimeout(() => {
        fetchWeather();
      }, 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDate, activeLat, activeLon]);

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <CloudSun className="h-4 w-4 text-[#E76F51]" />
          <h3 className="text-sm font-bold text-[#2D3436]">
            Weather Forecast
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          Check the weather prediction for your race day
        </p>
      </div>

      {/* Location input */}
      <div className="px-4 pt-3 pb-2">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Location
        </p>
        <div className="relative">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-[#1B4332] focus-within:ring-1 focus-within:ring-[#1B4332] transition-all">
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
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown results */}
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
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E76F51]" />
                      <span className="text-[#2D3436] line-clamp-2 leading-tight">
                        {r.display_name}
                      </span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          {/* Geo error */}
          {geoError && !geoLoading && locationQuery && (
            <p className="mt-1 text-xs text-red-400">{geoError}</p>
          )}
        </div>

        {/* Active location badge */}
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

      {/* Date input */}
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
          className="rounded-lg bg-[#2D3436] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1B4332] disabled:opacity-50"
        >
          {loading ? "..." : "Check"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Weather results */}
      <AnimatePresence>
        {weather && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Main weather card */}
            <div className="mx-4 mb-3 rounded-xl bg-[#1B4332] p-4 text-white">
              <p className="text-xs text-white/60">{weather.date}</p>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <span className="text-3xl">
                    {getWeatherEmoji(weather.weatherCode)}
                  </span>
                  <p className="mt-1 text-sm font-medium">
                    {weather.weatherDescription}
                  </p>
                  <p className="text-xs text-white/60">
                    Feels like {weather.feelsLikeMax}° / {weather.feelsLikeMin}°C
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">
                    {Math.round(weather.temperatureMax)}°
                  </p>
                  <p className="text-sm text-white/60">
                    / {Math.round(weather.temperatureMin)}°C
                  </p>
                </div>
              </div>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-2 px-4 pb-3">
              <WeatherDetailCard
                icon={<Droplets className="h-3.5 w-3.5 text-blue-400" />}
                label="RAIN PROBABILITY"
                value={`${weather.rainProbability}%`}
              />
              <WeatherDetailCard
                icon={<Droplets className="h-3.5 w-3.5 text-blue-500" />}
                label="PRECIPITATION"
                value={`${weather.precipitation} mm`}
              />
              <WeatherDetailCard
                icon={<Wind className="h-3.5 w-3.5 text-teal-500" />}
                label="WIND"
                value={`${weather.windSpeed} km/h ${weather.windDirection}`}
              />
              <WeatherDetailCard
                icon={<Eye className="h-3.5 w-3.5 text-blue-400" />}
                label="HUMIDITY"
                value={`${weather.humidity}%`}
              />
              <WeatherDetailCard
                icon={<Sun className="h-3.5 w-3.5 text-yellow-500" />}
                label="UV INDEX"
                value={`${weather.uvIndex}`}
              />
              <WeatherDetailCard
                icon={<Thermometer className="h-3.5 w-3.5 text-red-400" />}
                label="FEELS LIKE"
                value={`${weather.feelsLikeMax}°C`}
              />
            </div>

            {/* Sunrise / Sunset */}
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">🌅</span>
                <span className="text-xs font-medium text-[#2D3436]">
                  {weather.sunrise}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">🌇</span>
                <span className="text-xs font-medium text-[#2D3436]">
                  {weather.sunset}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WeatherDetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 p-2.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
          {label}
        </span>
      </div>
      <p className="mt-1 text-sm font-bold text-[#2D3436]">{value}</p>
    </div>
  );
}
