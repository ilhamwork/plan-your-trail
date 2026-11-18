"use server"

import { z } from "zod"
import { getSession } from "@/lib/auth"
import {
  getTourStatus,
  markRegisteredTourPhaseDone,
  type RegisteredTourStatus,
} from "@/lib/db/queries/profiles"
import type { ActionResult } from "@/lib/types"

const TourPhaseSchema = z.enum(["empty", "analysis"])

export async function getRegisteredTourStatusAction(): Promise<
  ActionResult<RegisteredTourStatus>
> {
  const session = await getSession()
  if (!session) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    }
  }

  try {
    const status = await getTourStatus(session.user.id)
    return { ok: true, data: status }
  } catch (err) {
    console.error("Failed to fetch registered tour status:", err)
    return {
      ok: false,
      error: { code: "DATABASE_ERROR", message: "Failed to load tour status." },
    }
  }
}

export async function completeRegisteredTourPhaseAction(
  phase: "empty" | "analysis"
): Promise<ActionResult<RegisteredTourStatus>> {
  const session = await getSession()
  if (!session) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    }
  }

  const parsed = TourPhaseSchema.safeParse(phase)
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid tour phase." },
    }
  }

  try {
    const status = await markRegisteredTourPhaseDone(
      session.user.id,
      parsed.data
    )
    return { ok: true, data: status }
  } catch (err) {
    console.error("Failed to save registered tour status:", err)
    return {
      ok: false,
      error: { code: "DATABASE_ERROR", message: "Failed to save tour status." },
    }
  }
}
