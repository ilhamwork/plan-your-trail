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
  deleteRoute,
} from "@/lib/db/queries/routes"
import { putObject, deleteObject } from "@/lib/storage"
import { parseGPXSync } from "@/lib/gpx-parser"
import { simplifyTrack } from "@/lib/gpx/simplify"
import type { ActionResult, GPXData } from "@/lib/types"

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

/**
 * Server action to save a route.
 * Strictly enforces user authentication, feature entitlements,
 * rate limits, 3-route limit (Free tier), upload size limits, track simplification,
 * and gzipped storage key format gpx/{userId}/{routeId}.gpx.gz.
 */
export async function saveRouteAction(
  rawInput: unknown
): Promise<ActionResult<{ routeId: string; name: string }>> {
  const session = await getSession()
  if (!session?.user) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Silakan masuk untuk menyimpan rute.",
      },
    }
  }

  const user = session.user
  if (!can(user, "save_route")) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "Paket Anda tidak memiliki izin untuk menyimpan rute.",
      },
    }
  }

  const parsed = SaveRouteInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message || "Input rute tidak valid.",
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
            ? "File ini melebihi batas upload 20 MB."
            : "File ini lebih dari 10 MB. Daftar early access Pro untuk upload sampai 20 MB.",
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
        message: "Terlalu banyak permintaan penyimpanan rute. Silakan coba lagi nanti.",
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
        message:
          "Kamu sudah menyimpan 3 rute. Hapus salah satu rute, atau daftar early access Pro.",
      },
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
        message: "Gagal memproses file GPX. Pastikan format file valid.",
      },
    }
  }

  if (!parsedGpx.trackPoints || parsedGpx.trackPoints.length === 0) {
    return {
      ok: false,
      error: {
        code: "EMPTY_TRACK",
        message: "File GPX tidak memiliki track points.",
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
        message: "Gagal mengompresi data GPX.",
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
        message: "Gagal menyimpan file ke penyimpanan cloud.",
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
        message: "Gagal menyimpan metadata rute ke database.",
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
  const session = await getSession()
  if (!session?.user) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Silakan masuk untuk menghapus rute.",
      },
    }
  }

  const parsed = DeleteRouteInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "ID rute tidak valid.",
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
        message: "Terlalu banyak permintaan penghapusan rute. Silakan coba lagi nanti.",
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
        message: "Rute tidak ditemukan atau Anda tidak memiliki akses.",
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
        message: "Gagal menghapus rute dari database.",
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
