"use server"

import { z } from "zod"
import { getSession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import {
  createWaitlistEntry,
  getWaitlistEntry,
} from "@/lib/db/queries/waitlist"
import type { ActionResult } from "@/lib/types"

const JoinWaitlistInputSchema = z.object({
  feature: z
    .string()
    .trim()
    .min(1, "Fitur pemicu waitlist tidak boleh kosong")
    .max(100),
  survey: z.record(z.string(), z.unknown()).optional(),
})

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
  const session = await getSession()
  if (!session?.user) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Silakan login untuk bergabung ke early access waitlist.",
      },
    }
  }

  const parsed = JoinWaitlistInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Input waitlist tidak valid.",
      },
    }
  }

  const { feature, survey } = parsed.data

  // Rate limit: max 10 waitlist joins per hour per account
  const rateLimitResult = await checkRateLimit(
    `waitlist:${session.user.id}`,
    10,
    3600
  )

  if (!rateLimitResult.allowed) {
    return {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message:
          "Terlalu banyak permintaan waitlist. Silakan tunggu beberapa saat.",
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

    return {
      ok: true,
      data: {
        id: created.id,
        feature: created.feature,
        alreadyJoined: false,
      },
    }
  } catch (error) {
    console.error("Failed to join waitlist:", error)
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Gagal mendaftar waitlist. Silakan coba lagi.",
      },
    }
  }
}
