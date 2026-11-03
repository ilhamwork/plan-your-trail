import { NextResponse } from "next/server"
import { lt, sql } from "drizzle-orm"
import { verifyCronRequest } from "@/lib/cron/auth"
import { db } from "@/lib/db"
import { weatherCache, rateLimit } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

/**
 * E7 Keep-Alive & Maintenance Cron Route.
 * Performs database keep-alive query and purges expired weather_cache
 * and stale rate_limit rows (>24 hours old).
 */
export async function GET(request: Request) {
  const authResult = verifyCronRequest(request)
  if (!authResult.ok) {
    return NextResponse.json(
      { ok: false, error: authResult.error },
      { status: authResult.status }
    )
  }

  const now = new Date()
  const staleWindowThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    // 1. Lightweight keep-alive query
    await db.execute(sql`SELECT 1 AS keep_alive`)

    // 2. Purge expired weather cache entries
    const deletedWeather = await db
      .delete(weatherCache)
      .where(lt(weatherCache.expiresAt, now))
      .returning({ key: weatherCache.key })

    // 3. Purge stale rate limit windows (>24h old)
    const deletedRateLimits = await db
      .delete(rateLimit)
      .where(lt(rateLimit.windowStart, staleWindowThreshold))
      .returning({ key: rateLimit.key })

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      cleaned: {
        weatherCache: deletedWeather.length,
        rateLimit: deletedRateLimits.length,
      },
    })
  } catch (err) {
    console.error(
      "Keep-alive cron error:",
      err instanceof Error ? err.message : "Unknown error"
    )
    return NextResponse.json(
      { ok: false, error: "Keep-alive database check failed" },
      { status: 500 }
    )
  }
}

