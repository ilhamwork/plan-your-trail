"use server"

import { z } from "zod"
import { getSession } from "@/lib/auth"
import { createRouteAnalysis } from "@/lib/db/queries/route-analysis"
import type { ActionResult } from "@/lib/types"

const RouteStatsSchema = z.object({
  totalDistance: z.number().nonnegative(),
  elevationGain: z.number().nonnegative(),
  elevationLoss: z.number().nonnegative(),
  highestPoint: z.number(),
  lowestPoint: z.number(),
  waypointCount: z.number().int().nonnegative(),
})

const RecordRouteAnalysisInputSchema = z.object({
  userName: z.string().max(100).optional(),
  fileName: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().nonnegative(),
  source: z.enum(["upload", "example"]).default("upload"),
  pointCount: z.number().int().nonnegative(),
  metrics: z.object({
    stats: RouteStatsSchema,
    bounds: z
      .tuple([
        z.tuple([z.number(), z.number()]),
        z.tuple([z.number(), z.number()]),
      ])
      .optional(),
    center: z.tuple([z.number(), z.number()]).optional(),
    raceDate: z.string().optional(),
    runnerName: z.string().optional(),
  }),
})

export type RecordRouteAnalysisInput = z.infer<
  typeof RecordRouteAnalysisInputSchema
>

/**
 * Server action to record route analysis metrics into the database.
 * Stored without uploading the GPX to object storage.
 * Supports both anonymous users (userId = null) and authenticated users.
 */
export async function recordRouteAnalysisAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = RecordRouteAnalysisInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          parsed.error.issues[0]?.message || "Input analisis rute tidak valid.",
      },
    }
  }

  try {
    const session = await getSession()
    const userId = session?.user?.id ?? null
    const userName =
      parsed.data.userName ||
      parsed.data.metrics.runnerName ||
      session?.user?.name ||
      null

    const created = await createRouteAnalysis({
      userId,
      userName,
      fileName: parsed.data.fileName,
      fileSizeBytes: parsed.data.fileSizeBytes,
      source: parsed.data.source,
      metrics: parsed.data.metrics,
      pointCount: parsed.data.pointCount,
    })

    return {
      ok: true,
      data: {
        id: created.id,
      },
    }
  } catch (err) {
    console.error("Failed to record route analysis:", err)
    return {
      ok: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Gagal menyimpan metrik analisis rute.",
      },
    }
  }
}
