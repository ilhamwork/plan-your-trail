"use server"

import { promisify } from "node:util"
import zlib from "node:zlib"
import { z } from "zod"
import { getSession } from "@/lib/auth"
import { can, limits, RATE_LIMITS } from "@/lib/entitlements"
import { checkRateLimit } from "@/lib/rate-limit"
import {
  countActiveRoutes,
  createRoute,
  getRoute,
  updateRoute,
  deleteRoute,
} from "@/lib/db/queries/routes"
import { putObject, deleteObject } from "@/lib/storage"
import { parseGPXSync } from "@/lib/gpx-parser"
import { simplifyTrack } from "@/lib/gpx/simplify"
import type { ActionResult, GPXData } from "@/lib/types"
import { getServerTranslations } from "@/lib/i18n/server"

const gzip = promisify(zlib.gzip)

const WaypointInputSchema = z
  .object({
    id: z.string().optional(),
    isFromGpx: z.boolean().optional(),
    name: z.string(),
    lat: z.number(),
    lon: z.number(),
    ele: z.number(),
    distance: z.number(),
  })
  .strict()

const SaveRouteInputSchema = z
  .object({
    name: z.string().trim().min(1, "Nama rute tidak boleh kosong").max(100),
    gpxContent: z.string().min(10, "Konten GPX tidak valid"),
    raceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
      .optional(),
    runnerName: z.string().max(100).optional(),
    waypoints: z.array(WaypointInputSchema).optional(),
  })
  .strict()

const DeleteRouteInputSchema = z
  .object({
    routeId: z.string().uuid("ID rute tidak valid"),
  })
  .strict()

const UpdateRouteInputSchema = z
  .object({
    routeId: z.string().uuid("ID rute tidak valid"),
    name: z.string().trim().min(1, "Nama rute tidak boleh kosong").max(100).optional(),
    raceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
      .optional()
      .nullable(),
    waypoints: z.array(WaypointInputSchema).optional(),
  })
  .strict()

/**
 * Server action to save a route.
 * Strictly enforces user authentication, feature entitlements,
 * rate limits, 3-route limit (Free tier), upload size limits, track simplification,
 * and gzipped storage key format gpx/{userId}/{routeId}.gpx.gz.
 */
export async function saveRouteAction(
  rawInput: unknown
): Promise<ActionResult<{ routeId: string; name: string }>> {
  const [{ t }, session] = await Promise.all([
    getServerTranslations(),
    getSession(),
  ])
  if (!session?.user) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: t("actions.routeSaveUnauthorized"),
      },
    }
  }

  const user = session.user
  if (!can(user, "save_route")) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: t("actions.routeSaveForbidden"),
      },
    }
  }

  const parsed = SaveRouteInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || t("actions.routeInputInvalid"),
      },
    }
  }

  const userLimits = limits(user)
  const contentBytes = Buffer.byteLength(parsed.data.gpxContent, "utf-8")

  // Check upload size limit
  if (contentBytes > userLimits.maxUploadBytes) {
    return {
      ok: false,
      error: {
        code: "FILE_TOO_LARGE",
        message:
          user.plan === "pro"
            ? t("actions.routeFileTooLargePro")
            : t("actions.routeFileTooLargeFree"),
      },
    }
  }

  // Per-account rate limit on route save
  const rateLimitResult = await checkRateLimit(
    `route_save:${user.id}`,
    RATE_LIMITS.saveRoutePerHour,
    RATE_LIMITS.saveRouteWindowSeconds
  )

  if (!rateLimitResult.allowed) {
    return {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: t("actions.routeSaveRateLimited"),
      },
    }
  }

  // Check max saved routes limit
  const activeCount = await countActiveRoutes(user.id)
  if (
    userLimits.maxSavedRoutes !== null &&
    activeCount >= userLimits.maxSavedRoutes
  ) {
    return {
      ok: false,
      error: {
        code: "LIMIT_REACHED",
        message: t("actions.routeLimitReached"),
      },
    }
  }

  // Check max custom waypoints limit
  if (
    parsed.data.waypoints &&
    userLimits.maxCustomWaypoints !== null
  ) {
    const customWaypoints = parsed.data.waypoints.filter(
      (wp) => wp.isFromGpx === false
    )
    if (customWaypoints.length > userLimits.maxCustomWaypoints) {
      return {
        ok: false,
        error: {
          code: "WAYPOINT_LIMIT_REACHED",
          message: t("actions.waypointLimitReached", {
            max: userLimits.maxCustomWaypoints,
          }),
        },
      }
    }
  }

  // Parse GPX and extract trackPoints & stats
  let parsedGpx: GPXData
  try {
    parsedGpx = parseGPXSync(parsed.data.gpxContent)
  } catch (err) {
    console.error("Failed to parse GPX on server:", err)
    return {
      ok: false,
      error: {
        code: "PARSE_ERROR",
        message: t("actions.gpxParseFailed"),
      },
    }
  }

  if (!parsedGpx.trackPoints || parsedGpx.trackPoints.length === 0) {
    return {
      ok: false,
      error: {
        code: "EMPTY_TRACK",
        message: t("actions.gpxEmptyTrack"),
      },
    }
  }

  // Simplify track points for fast database querying and map rendering
  const trackSimplified = simplifyTrack(parsedGpx.trackPoints)

  // Compress original GPX to gzip for S3/R2 storage
  let gzipped: Buffer
  try {
    gzipped = await gzip(Buffer.from(parsed.data.gpxContent, "utf-8"))
  } catch (err) {
    console.error("Failed to gzip GPX:", err)
    return {
      ok: false,
      error: {
        code: "COMPRESSION_ERROR",
        message: t("actions.gpxCompressionFailed"),
      },
    }
  }

  const routeId = crypto.randomUUID()
  const gpxObjectKey = `gpx/${user.id}/${routeId}.gpx.gz`

  try {
    await putObject(gpxObjectKey, gzipped, {
      contentType: "application/gpx+xml",
      contentEncoding: "gzip",
    })
  } catch (err) {
    console.error("Failed to upload GPX to storage:", err)
    return {
      ok: false,
      error: {
        code: "STORAGE_ERROR",
        message: t("actions.routeStorageError"),
      },
    }
  }

  const metrics = {
    stats: parsedGpx.stats,
    bounds: parsedGpx.bounds,
    center: parsedGpx.center,
    raceDate: parsed.data.raceDate,
    runnerName: parsed.data.runnerName,
    waypoints: parsed.data.waypoints ?? parsedGpx.waypoints,
  }

  try {
    await createRoute(user.id, {
      id: routeId,
      name: parsed.data.name,
      userName: parsed.data.runnerName || user.name || null,
      metrics,
      trackSimplified,
      gpxObjectKey,
      hidden: false,
    })
  } catch (err) {
    console.error("Failed to insert route in DB:", err)
    // Clean up uploaded storage object if DB insert fails
    try {
      await deleteObject(gpxObjectKey)
    } catch {
      // ignore rollback cleanup error
    }
    return {
      ok: false,
      error: {
        code: "DB_ERROR",
        message: t("actions.routeDbSaveError"),
      },
    }
  }

  return {
    ok: true,
    data: {
      routeId,
      name: parsed.data.name,
    },
  }
}

/**
 * Server action to permanently delete a saved route.
 * Deletes both the database record and the S3/R2 object.
 * Enforces owner-scoping and rate limiting.
 */
export async function deleteRouteAction(
  rawInput: unknown
): Promise<ActionResult<{ success: true }>> {
  const [{ t }, session] = await Promise.all([
    getServerTranslations(),
    getSession(),
  ])
  if (!session?.user) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: t("actions.routeDeleteUnauthorized"),
      },
    }
  }

  const parsed = DeleteRouteInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: t("actions.routeIdInvalid"),
      },
    }
  }

  const rateLimitResult = await checkRateLimit(
    `route_delete:${session.user.id}`,
    RATE_LIMITS.deleteRoutePerHour,
    RATE_LIMITS.deleteRouteWindowSeconds
  )

  if (!rateLimitResult.allowed) {
    return {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: t("actions.routeDeleteRateLimited"),
      },
    }
  }

  const { routeId } = parsed.data
  const existingRoute = await getRoute(session.user.id, routeId)

  if (!existingRoute) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: t("actions.routeNotFound"),
      },
    }
  }

  // Permanently delete storage object
  try {
    await deleteObject(existingRoute.gpxObjectKey)
  } catch (err) {
    console.warn("Could not delete storage object:", err)
  }

  // Permanently delete database record
  try {
    await deleteRoute(session.user.id, routeId)
  } catch (err) {
    console.error("Failed to delete route from DB:", err)
    return {
      ok: false,
      error: {
        code: "DB_ERROR",
        message: t("actions.routeDbDeleteError"),
      },
    }
  }

  return {
    ok: true,
    data: {
      success: true,
    },
  }
}

/**
 * Server action to update a saved route (name, raceDate, waypoints).
 * Enforces authentication, owner scoping, rate limits, and custom waypoint limits.
 */
export async function updateRouteAction(
  rawInput: unknown
): Promise<ActionResult<{ routeId: string; name: string }>> {
  const [{ t }, session] = await Promise.all([
    getServerTranslations(),
    getSession(),
  ])
  if (!session?.user) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: t("actions.routeUpdateUnauthorized"),
      },
    }
  }

  const user = session.user
  if (!can(user, "save_route")) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: t("actions.routeUpdateForbidden"),
      },
    }
  }

  const parsed = UpdateRouteInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || t("actions.routeInputInvalid"),
      },
    }
  }

  // Check waypoint limits
  const userLimits = limits(user)
  if (parsed.data.waypoints && userLimits.maxCustomWaypoints !== null) {
    const customWaypoints = parsed.data.waypoints.filter(
      (wp) => wp.isFromGpx === false
    )
    if (customWaypoints.length > userLimits.maxCustomWaypoints) {
      return {
        ok: false,
        error: {
          code: "WAYPOINT_LIMIT_REACHED",
          message: t("actions.waypointLimitReached", {
            max: userLimits.maxCustomWaypoints,
          }),
        },
      }
    }
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(
    `route_update:${user.id}`,
    RATE_LIMITS.saveRoutePerHour,
    RATE_LIMITS.saveRouteWindowSeconds
  )
  if (!rateLimitResult.allowed) {
    return {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: t("actions.routeUpdateRateLimited"),
      },
    }
  }

  // Owner-scoped check
  const existingRoute = await getRoute(user.id, parsed.data.routeId)
  if (!existingRoute) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: t("actions.routeNotFound"),
      },
    }
  }

  const currentMetrics = (existingRoute.metrics as Record<string, unknown>) || {}
  const updatedMetrics = {
    ...currentMetrics,
    ...(parsed.data.raceDate !== undefined ? { raceDate: parsed.data.raceDate ?? undefined } : {}),
    ...(parsed.data.waypoints !== undefined ? { waypoints: parsed.data.waypoints } : {}),
  }

  try {
    const updated = await updateRoute(user.id, parsed.data.routeId, {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      metrics: updatedMetrics,
    })

    if (!updated) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: t("actions.routeUpdateFailed"),
        },
      }
    }

    return {
      ok: true,
      data: {
        routeId: updated.id,
        name: updated.name,
      },
    }
  } catch (err) {
    console.error("Failed to update route in DB:", err)
    return {
      ok: false,
      error: {
        code: "DB_ERROR",
        message: t("actions.routeDbUpdateError"),
      },
    }
  }
}
