"use server"

import { z } from "zod"
import { getWeatherForecast, type ActionResult, type WeatherData } from "@/lib/weather"

const WeatherInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
})

export async function fetchWeatherAction(
  rawInput: unknown
): Promise<ActionResult<WeatherData>> {
  const parsed = WeatherInputSchema.safeParse(rawInput)

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Parameter lokasi atau tanggal tidak valid.",
      },
    }
  }

  const { lat, lon, date } = parsed.data
  return await getWeatherForecast(lat, lon, date)
}
