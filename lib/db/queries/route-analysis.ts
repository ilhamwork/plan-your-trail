import { desc, eq } from "drizzle-orm"
import { db } from "../client"
import { routeAnalysis, type RouteAnalysis, type NewRouteAnalysis } from "../schema"

/**
 * Inserts a new route analysis record.
 * Supports both anonymous users (userId = null) and authenticated users.
 */
export async function createRouteAnalysis(
  data: Omit<NewRouteAnalysis, "id" | "createdAt">
): Promise<RouteAnalysis> {
  const [created] = await db
    .insert(routeAnalysis)
    .values(data)
    .returning()

  return created
}

/**
 * Lists route analyses for a given user.
 */
export async function listUserRouteAnalyses(
  userId: string
): Promise<RouteAnalysis[]> {
  return db
    .select()
    .from(routeAnalysis)
    .where(eq(routeAnalysis.userId, userId))
    .orderBy(desc(routeAnalysis.createdAt))
}

/**
 * Retrieves a single route analysis by its ID.
 */
export async function getRouteAnalysis(
  id: string
): Promise<RouteAnalysis | null> {
  const [result] = await db
    .select()
    .from(routeAnalysis)
    .where(eq(routeAnalysis.id, id))
    .limit(1)

  return result ?? null
}

