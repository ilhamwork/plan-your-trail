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
