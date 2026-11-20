"use server"

import { z } from "zod"
import { getSession } from "@/lib/auth"
import { RATE_LIMITS } from "@/lib/entitlements"
import { checkRateLimit } from "@/lib/rate-limit"
import {
  createWaitlistEntry,
  getWaitlistEntry,
} from "@/lib/db/queries/waitlist"
import type { ActionResult } from "@/lib/types"
import { getServerTranslations } from "@/lib/i18n/server"
import { logger } from "@/lib/logger"
import { writeAuditLog } from "@/lib/db/queries/audit-log"

const JoinWaitlistInputSchema = z
  .object({
    feature: z
      .string()
      .trim()
      .min(1, "Fitur pemicu waitlist tidak boleh kosong")
      .max(100),
    survey: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export type JoinWaitlistInput = z.infer<typeof JoinWaitlistInputSchema>

export interface JoinWaitlistResult {
  id: string
  feature: string
  alreadyJoined?: boolean
}

/**
 * Server Action for joining a feature early access waitlist (E6-T3).
 * Requires authenticated session, rate limited per user.
 */
export async function joinWaitlistAction(
  rawInput: unknown
): Promise<ActionResult<JoinWaitlistResult>> {
  const [{ t }, session] = await Promise.all([
    getServerTranslations(),
    getSession(),
  ])
  if (!session?.user) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: t("actions.waitlistUnauthorized"),
      },
    }
  }

  const parsed = JoinWaitlistInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || t("actions.waitlistInputInvalid"),
      },
    }
  }

  const { feature, survey } = parsed.data

  // Rate limit per account from config
  const rateLimitResult = await checkRateLimit(
    `waitlist:${session.user.id}`,
    RATE_LIMITS.waitlistPerHour,
    RATE_LIMITS.waitlistWindowSeconds
  )

  if (!rateLimitResult.allowed) {
    return {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: t("actions.waitlistRateLimited"),
      },
    }
  }

  try {
    // Check if already on waitlist for this specific feature
    const existing = await getWaitlistEntry(session.user.id, feature)
    if (existing) {
      return {
        ok: true,
        data: {
          id: existing.id,
          feature: existing.feature,
          alreadyJoined: true,
        },
      }
    }

    const created = await createWaitlistEntry(
      session.user.id,
      feature,
      survey
    )

    void writeAuditLog({
      userId: session.user.id,
      action: "waitlist.join",
      entityType: "waitlist",
      entityId: created.id,
      payload: { feature },
    })

    logger.info(
      {
        action: "joinWaitlist",
        userId: session.user.id,
        waitlistId: created.id,
        feature,
      },
      "User joined waitlist successfully"
    )

    return {
      ok: true,
      data: {
        id: created.id,
        feature: created.feature,
        alreadyJoined: false,
      },
    }
  } catch (error) {
    logger.error({ err: error, userId: session.user.id, feature }, "Failed to join waitlist")
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: t("actions.waitlistError"),
      },
    }
  }
}
