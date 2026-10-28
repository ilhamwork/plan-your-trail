import { and, desc, eq } from "drizzle-orm"
import { db } from "../client"
import { waitlist, type Waitlist } from "../schema"

/**
 * Owner-scoped query helper for inserting a waitlist entry.
 * AGENTS.md Hard Rule: First parameter is always userId.
 */
export async function createWaitlistEntry(
  userId: string,
  feature: string,
  survey?: Record<string, unknown>
): Promise<Waitlist> {
  const [created] = await db
    .insert(waitlist)
    .values({
      userId,
      feature,
      survey: survey ?? null,
    })
    .returning()

  return created
}

/**
 * Owner-scoped helper to get a waitlist entry for a specific feature and user.
 */
export async function getWaitlistEntry(
  userId: string,
  feature: string
): Promise<Waitlist | null> {
  const results = await db
    .select()
    .from(waitlist)
    .where(and(eq(waitlist.userId, userId), eq(waitlist.feature, feature)))
    .limit(1)

  return results[0] ?? null
}

/**
 * Checks whether a user has already registered interest for a feature waitlist.
 */
export async function hasJoinedWaitlist(
  userId: string,
  feature: string
): Promise<boolean> {
  const entry = await getWaitlistEntry(userId, feature)
  return entry !== null
}

/**
 * Owner-scoped helper to list all waitlist entries registered by a user.
 */
export async function listWaitlistEntries(userId: string): Promise<Waitlist[]> {
  return db
    .select()
    .from(waitlist)
    .where(eq(waitlist.userId, userId))
    .orderBy(desc(waitlist.createdAt))
}
