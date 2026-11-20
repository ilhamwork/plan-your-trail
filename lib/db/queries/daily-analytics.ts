import { and, gte, lt, count, eq, desc, sql } from "drizzle-orm"
import { db } from "../client"
import {
  dailyAnalytics,
  routeAnalysis,
  savedRoute,
  user,
  waitlist,
  feedback,
  auditLog,
  type DailyAnalytics,
} from "../schema"

export interface DailyAnalyticsMetrics {
  analyses: {
    total: number
    anonymous: number
    authenticated: number
    bySource: {
      upload: number
      example: number
    }
    totalFileSizeBytes: number
    totalPointsProcessed: number
  }
  routes: {
    totalSaved: number
    activeSaved: number
    hiddenSaved: number
  }
  users: {
    newRegistrations: number
  }
  waitlist: {
    totalJoined: number
    byFeature: Record<string, number>
  }
  feedback: {
    totalSubmitted: number
  }
  audit: {
    totalEvents: number
  }
}

/**
 * Computes aggregated daily metrics across system tables for a given UTC date (YYYY-MM-DD).
 */
export async function computeDailyMetrics(
  targetDate: string
): Promise<DailyAnalyticsMetrics> {
  const startOfDay = new Date(`${targetDate}T00:00:00.000Z`)
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  // 1. Analyses & Uploads
  const analysesRows = await db
    .select({
      id: routeAnalysis.id,
      userId: routeAnalysis.userId,
      source: routeAnalysis.source,
      fileSizeBytes: routeAnalysis.fileSizeBytes,
      pointCount: routeAnalysis.pointCount,
    })
    .from(routeAnalysis)
    .where(
      and(
        gte(routeAnalysis.createdAt, startOfDay),
        lt(routeAnalysis.createdAt, endOfDay)
      )
    )

  const analysesTotal = analysesRows.length
  let anonymousAnalyses = 0
  let authenticatedAnalyses = 0
  let uploadSourceCount = 0
  let exampleSourceCount = 0
  let totalFileSizeBytes = 0
  let totalPointsProcessed = 0

  for (const row of analysesRows) {
    if (row.userId) {
      authenticatedAnalyses++
    } else {
      anonymousAnalyses++
    }

    if (row.source === "example") {
      exampleSourceCount++
    } else {
      uploadSourceCount++
    }

    totalFileSizeBytes += row.fileSizeBytes || 0
    totalPointsProcessed += row.pointCount || 0
  }

  // 2. Saved Routes
  const routesRows = await db
    .select({
      id: savedRoute.id,
      hidden: savedRoute.hidden,
    })
    .from(savedRoute)
    .where(
      and(
        gte(savedRoute.createdAt, startOfDay),
        lt(savedRoute.createdAt, endOfDay)
      )
    )

  const totalSaved = routesRows.length
  let activeSaved = 0
  let hiddenSaved = 0

  for (const row of routesRows) {
    if (row.hidden) {
      hiddenSaved++
    } else {
      activeSaved++
    }
  }

  // 3. User Registrations
  const [usersCountRow] = await db
    .select({ total: count() })
    .from(user)
    .where(and(gte(user.createdAt, startOfDay), lt(user.createdAt, endOfDay)))

  // 4. Pro Waitlist Joins
  const waitlistRows = await db
    .select({
      id: waitlist.id,
      feature: waitlist.feature,
    })
    .from(waitlist)
    .where(
      and(
        gte(waitlist.createdAt, startOfDay),
        lt(waitlist.createdAt, endOfDay)
      )
    )

  const waitlistByFeature: Record<string, number> = {}
  for (const row of waitlistRows) {
    waitlistByFeature[row.feature] = (waitlistByFeature[row.feature] || 0) + 1
  }

  // 5. User Feedback (Auxiliary table)
  let feedbackCount = 0
  try {
    const [feedbackCountRow] = await db
      .select({ total: count() })
      .from(feedback)
      .where(
        and(
          gte(feedback.createdAt, startOfDay),
          lt(feedback.createdAt, endOfDay)
        )
      )
    feedbackCount = Number(feedbackCountRow?.total ?? 0)
  } catch {
    feedbackCount = 0
  }

  // 6. Security / System Audit Events
  const [auditCountRow] = await db
    .select({ total: count() })
    .from(auditLog)
    .where(
      and(
        gte(auditLog.createdAt, startOfDay),
        lt(auditLog.createdAt, endOfDay)
      )
    )

  return {
    analyses: {
      total: analysesTotal,
      anonymous: anonymousAnalyses,
      authenticated: authenticatedAnalyses,
      bySource: {
        upload: uploadSourceCount,
        example: exampleSourceCount,
      },
      totalFileSizeBytes,
      totalPointsProcessed,
    },
    routes: {
      totalSaved,
      activeSaved,
      hiddenSaved,
    },
    users: {
      newRegistrations: Number(usersCountRow?.total ?? 0),
    },
    waitlist: {
      totalJoined: waitlistRows.length,
      byFeature: waitlistByFeature,
    },
    feedback: {
      totalSubmitted: feedbackCount,
    },
    audit: {
      totalEvents: Number(auditCountRow?.total ?? 0),
    },
  }
}

/**
 * Upserts daily analytics metrics for a target date (YYYY-MM-DD).
 * If a row for the date already exists, it updates metrics and updatedAt.
 */
export async function upsertDailyAnalytics(
  date: string,
  metrics: DailyAnalyticsMetrics
): Promise<DailyAnalytics> {
  const [result] = await db
    .insert(dailyAnalytics)
    .values({
      date,
      metrics,
    })
    .onConflictDoUpdate({
      target: dailyAnalytics.date,
      set: {
        metrics,
        updatedAt: sql`now()`,
      },
    })
    .returning()

  return result
}

/**
 * Retrieves daily analytics for a single date.
 */
export async function getDailyAnalytics(
  date: string
): Promise<DailyAnalytics | null> {
  const [result] = await db
    .select()
    .from(dailyAnalytics)
    .where(eq(dailyAnalytics.date, date))
    .limit(1)

  return result ?? null
}

/**
 * Lists the most recent daily analytics entries.
 */
export async function listDailyAnalytics(
  limit = 30
): Promise<DailyAnalytics[]> {
  return db
    .select()
    .from(dailyAnalytics)
    .orderBy(desc(dailyAnalytics.date))
    .limit(limit)
}
