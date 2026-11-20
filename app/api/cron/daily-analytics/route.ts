import { NextResponse } from "next/server"
import { z } from "zod"
import { verifyCronRequest } from "@/lib/cron/auth"
import {
  computeDailyMetrics,
  upsertDailyAnalytics,
} from "@/lib/db/queries/daily-analytics"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const DateParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD")
  .refine((val) => !Number.isNaN(Date.parse(`${val}T00:00:00Z`)), "Invalid calendar date")

function getYesterdayUtcDate(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function handleDailyAnalytics(request: Request) {
  const authResult = verifyCronRequest(request)
  if (!authResult.ok) {
    return NextResponse.json(
      { ok: false, error: authResult.error },
      { status: authResult.status }
    )
  }

  const url = new URL(request.url)
  const rawDate = url.searchParams.get("date")

  let targetDate = getYesterdayUtcDate()
  if (rawDate) {
    const parseResult = DateParamSchema.safeParse(rawDate)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parseResult.error.issues[0]?.message ?? "Invalid date parameter",
        },
        { status: 400 }
      )
    }
    targetDate = parseResult.data
  }

  const startTime = Date.now()

  try {
    const metrics = await computeDailyMetrics(targetDate)
    const saved = await upsertDailyAnalytics(targetDate, metrics)
    const durationMs = Date.now() - startTime

    logger.info(
      {
        targetDate,
        durationMs,
        summary: {
          analyses: metrics.analyses.total,
          routesSaved: metrics.routes.totalSaved,
          newUsers: metrics.users.newRegistrations,
          waitlist: metrics.waitlist.totalJoined,
        },
      },
      "Daily analytics cron completed"
    )

    return NextResponse.json({
      ok: true,
      date: targetDate,
      metrics,
      durationMs,
      updatedAt: saved.updatedAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    logger.error(
      { err, targetDate },
      "Daily analytics cron failed"
    )

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to compute daily analytics",
        details: message,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return handleDailyAnalytics(request)
}

export async function POST(request: Request) {
  return handleDailyAnalytics(request)
}
