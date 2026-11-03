import { NextResponse } from "next/server"
import { count, gte, like, and, sql } from "drizzle-orm"
import { verifyCronRequest } from "@/lib/cron/auth"
import { db } from "@/lib/db"
import { user, route, rateLimit } from "@/lib/db/schema"
import { OPS_QUOTAS } from "@/lib/entitlements/config"

export const dynamic = "force-dynamic"

export interface QuotaMetrics {
  dbSizeBytes: number
  dbMaxBytes: number
  dbUsageRatio: number
  totalUsers: number
  totalRoutes: number
  dailyEmailResends: number
  resendDailyLimit: number
}

/**
 * E7 Quota Monitor Cron Route (PRD Section 9.6).
 * Monitors Postgres DB size against configured cap (warns at 80%)
 * and daily email resend triggers against Resend Free 100/day cap (warns at 70%).
 */
export async function GET(request: Request) {
  const authResult = verifyCronRequest(request)
  if (!authResult.ok) {
    return NextResponse.json(
      { ok: false, error: authResult.error },
      { status: authResult.status }
    )
  }

  try {
    const sizeRows = await db.execute<{ size_bytes: string | number }>(
      sql`SELECT pg_database_size(current_database()) AS size_bytes`
    )
    const firstRow = Array.isArray(sizeRows) ? sizeRows[0] : undefined
    const dbSizeBytes = Number(firstRow?.size_bytes ?? 0)

    const [userCountRow] = await db.select({ total: count() }).from(user)
    const [routeCountRow] = await db.select({ total: count() }).from(route)

    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)

    const emailRateRows = await db
      .select({ count: rateLimit.count })
      .from(rateLimit)
      .where(
        and(
          like(rateLimit.key, "email-resend:%"),
          gte(rateLimit.windowStart, startOfDay)
        )
      )

    const dailyEmailResends = emailRateRows.reduce(
      (sum, row) => sum + (Number(row.count) || 0),
      0
    )

    const dbUsageRatio = dbSizeBytes / OPS_QUOTAS.maxDbBytes
    const emailUsageRatio = dailyEmailResends / OPS_QUOTAS.resendDailyLimit

    const warnings: string[] = []
    if (dbUsageRatio >= OPS_QUOTAS.dbWarnRatio) {
      warnings.push(
        `Database usage at ${(dbUsageRatio * 100).toFixed(1)}% (${Math.round(
          dbSizeBytes / (1024 * 1024)
        )} MB / ${Math.round(OPS_QUOTAS.maxDbBytes / (1024 * 1024))} MB)`
      )
    }

    if (emailUsageRatio >= OPS_QUOTAS.resendWarnRatio) {
      warnings.push(
        `Daily auth email usage at ${(emailUsageRatio * 100).toFixed(1)}% (${dailyEmailResends} / ${OPS_QUOTAS.resendDailyLimit})`
      )
    }

    const metrics: QuotaMetrics = {
      dbSizeBytes,
      dbMaxBytes: OPS_QUOTAS.maxDbBytes,
      dbUsageRatio: Number(dbUsageRatio.toFixed(4)),
      totalUsers: userCountRow?.total ?? 0,
      totalRoutes: routeCountRow?.total ?? 0,
      dailyEmailResends,
      resendDailyLimit: OPS_QUOTAS.resendDailyLimit,
    }

    return NextResponse.json({
      ok: true,
      status: warnings.length > 0 ? "warning" : "healthy",
      metrics,
      warnings,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error(
      "Quota monitor cron error:",
      err instanceof Error ? err.message : "Unknown error"
    )
    return NextResponse.json(
      { ok: false, error: "Failed to evaluate operational quotas" },
      { status: 500 }
    )
  }
}

