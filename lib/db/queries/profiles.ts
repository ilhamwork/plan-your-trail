import { eq } from "drizzle-orm"
import { db } from "../client"
import { profile, type Profile } from "../schema"

/**
 * Owner-scoped query helper for user profile.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const [userProfile] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1)

  return userProfile ?? null
}

/**
 * Creates or updates a user profile.
 */
export async function upsertProfile(
  userId: string,
  plan: "free" | "pro" = "free"
): Promise<Profile> {
  const [saved] = await db
    .insert(profile)
    .values({
      userId,
      plan,
    })
    .onConflictDoUpdate({
      target: profile.userId,
      set: {
        plan,
        updatedAt: new Date(),
      },
    })
    .returning()

  return saved
}

export interface RegisteredTourStatus {
  empty: boolean
  analysis: boolean
}

/**
 * Owner-scoped query helper returning registered user guided tour completion status.
 */
export async function getTourStatus(
  userId: string
): Promise<RegisteredTourStatus> {
  const [row] = await db
    .select({
      tourEmptyDone: profile.tourEmptyDone,
      tourAnalysisDone: profile.tourAnalysisDone,
    })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1)

  if (!row) {
    return { empty: false, analysis: false }
  }

  return {
    empty: row.tourEmptyDone,
    analysis: row.tourAnalysisDone,
  }
}

/**
 * Owner-scoped mutation helper marking a registered user guided tour phase as completed.
 */
export async function markRegisteredTourPhaseDone(
  userId: string,
  phase: "empty" | "analysis"
): Promise<RegisteredTourStatus> {
  const patch =
    phase === "empty" ? { tourEmptyDone: true } : { tourAnalysisDone: true }

  const [saved] = await db
    .insert(profile)
    .values({
      userId,
      plan: "free",
      ...patch,
    })
    .onConflictDoUpdate({
      target: profile.userId,
      set: {
        ...patch,
        updatedAt: new Date(),
      },
    })
    .returning({
      tourEmptyDone: profile.tourEmptyDone,
      tourAnalysisDone: profile.tourAnalysisDone,
    })

  return {
    empty: saved.tourEmptyDone,
    analysis: saved.tourAnalysisDone,
  }
}
