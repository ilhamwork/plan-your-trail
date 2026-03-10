"use client";

import { useState, useCallback } from "react";
import { CloudSun, Droplets, Wind, Thermometer, Sun, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WeatherForecastProps {
  center: [number, number]; // [lat, lon]
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

export function WeatherForecast({ center }: WeatherForecastProps) {
  const [date, setDate] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    if (!date) return;

    setLoading(true);
    setError(null);

    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", center[0].toFixed(4));
      url.searchParams.set("longitude", center[1].toFixed(4));
      url.searchParams.set(
        "daily",
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max,apparent_temperature_max,apparent_temperature_min"
      );
      url.searchParams.set("hourly", "relative_humidity_2m");
      url.searchParams.set("start_date", date);
      url.searchParams.set("end_date", date);
      url.searchParams.set("timezone", "auto");

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
        weatherDescription:
          WMO_CODES[d.weather_code[0]] || "Unknown",
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
  }, [date, center]);

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

      {/* Date input */}
      <div className="flex items-center gap-2 px-4 py-3">
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
