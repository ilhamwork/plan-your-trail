import { db } from "../db"
import { rateLimit } from "../db/schema"
import { eq, sql } from "drizzle-orm"

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

/**
 * Check and record a rate limit attempt using the PostgreSQL rate_limit table.
 *
 * @param key Unique identifier (e.g. "auth:login:127.0.0.1", "auth:reset:user@example.com")
 * @param maxAttempts Maximum allowed attempts within the window
 * @param windowSeconds Window length in seconds
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = new Date()

  try {
    const existing = await db
      .select()
      .from(rateLimit)
      .where(eq(rateLimit.key, key))
      .limit(1)

    if (existing.length === 0) {
      // First attempt
      await db.insert(rateLimit).values({
        key,
        windowStart: now,
        count: 1,
      })

      return {
        allowed: true,
        remaining: Math.max(0, maxAttempts - 1),
        resetInSeconds: windowSeconds,
      }
    }

    const current = existing[0]
    const elapsedSeconds = Math.floor(
      (now.getTime() - new Date(current.windowStart).getTime()) / 1000
    )

    if (elapsedSeconds >= windowSeconds) {
      // Window expired, reset window and count
      await db
        .update(rateLimit)
        .set({
          windowStart: now,
          count: 1,
        })
        .where(eq(rateLimit.key, key))

      return {
        allowed: true,
        remaining: Math.max(0, maxAttempts - 1),
        resetInSeconds: windowSeconds,
      }
    }

    // Window still active
    const nextCount = current.count + 1
    const resetInSeconds = Math.max(1, windowSeconds - elapsedSeconds)

    if (nextCount > maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds,
      }
    }

    await db
      .update(rateLimit)
      .set({
        count: sql`${rateLimit.count} + 1`,
      })
      .where(eq(rateLimit.key, key))

    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - nextCount),
      resetInSeconds,
    }
  } catch (error) {
    // If DB is unreachable or in non-DB tests, allow with warning to avoid breaking flows
    console.error(`Rate limit check error for key ${key}:`, error)
    return {
      allowed: true,
      remaining: 1,
      resetInSeconds: windowSeconds,
    }
  }
}

/**
 * Enforce a strict minimum cooldown between actions (e.g. email resend >= 60s per user).
 *
 * @param key Unique key for the action (e.g. "email-resend:user@example.com")
 * @param cooldownSeconds Minimum seconds required before next allowed action
 */
export async function checkCooldown(
  key: string,
  cooldownSeconds: number = 60
): Promise<{ allowed: boolean; remainingSeconds: number }> {
  const result = await checkRateLimit(key, 1, cooldownSeconds)
  return {
    allowed: result.allowed,
    remainingSeconds: result.resetInSeconds,
  }
}
