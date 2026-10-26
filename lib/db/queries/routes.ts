import { and, desc, eq, count } from "drizzle-orm"
import { db } from "../client"
import { route, type Route, type NewRoute } from "../schema"

/**
 * Owner-scoped query helper for listing non-hidden routes.
 * AGENTS.md Hard Rule: First parameter is always userId.
 */
export async function listRoutes(userId: string): Promise<Route[]> {
  return db
    .select()
    .from(route)
    .where(and(eq(route.userId, userId), eq(route.hidden, false)))
    .orderBy(desc(route.createdAt))
}

/**
 * Owner-scoped query helper for retrieving a specific route.
 * Prevents user A from accessing user B's route.
 */
export async function getRoute(
  userId: string,
  routeId: string
): Promise<Route | null> {
  const results = await db
    .select()
    .from(route)
    .where(and(eq(route.userId, userId), eq(route.id, routeId)))
    .limit(1)

  return results[0] ?? null
}

/**
 * Counts non-hidden routes owned by user for Free tier limit enforcement (3 routes).
 */
export async function countActiveRoutes(userId: string): Promise<number> {
  const [result] = await db
    .select({ total: count() })
    .from(route)
    .where(and(eq(route.userId, userId), eq(route.hidden, false)))

  return result?.total ?? 0
}

/**
 * Owner-scoped insert helper for a new route.
 */
export async function createRoute(
  userId: string,
  data: Omit<NewRoute, "userId" | "id" | "createdAt">
): Promise<Route> {
  const [created] = await db
    .insert(route)
    .values({
      ...data,
      userId,
    })
    .returning()

  return created
}

/**
 * Owner-scoped helper to mark a route as hidden (e.g. on tier downgrade).
 */
export async function hideRoute(
  userId: string,
  routeId: string
): Promise<Route | null> {
  const [updated] = await db
    .update(route)
    .set({ hidden: true })
    .where(and(eq(route.userId, userId), eq(route.id, routeId)))
    .returning()

  return updated ?? null
}

/**
 * Owner-scoped helper to permanently delete a route.
 */
export async function deleteRoute(
  userId: string,
  routeId: string
): Promise<boolean> {
  const result = await db
    .delete(route)
    .where(and(eq(route.userId, userId), eq(route.id, routeId)))
    .returning({ id: route.id })

  return result.length > 0
}
