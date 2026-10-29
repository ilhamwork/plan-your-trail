import { NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/auth"
import { can, RATE_LIMITS } from "@/lib/entitlements"
import { checkRateLimit } from "@/lib/rate-limit"
import { getRoute } from "@/lib/db/queries/routes"
import { signedUrl } from "@/lib/storage"

const RouteParamsSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z0-9_-]+$/, "Invalid route ID format"),
  })
  .strict()

/**
 * Owner-only signed URL redirect for downloading original GPX.
 * AGENTS.md E4-T4 & Section 8: Validates params with Zod, checks rate limit,
 * verifies owner and object key prefix, and redirects to 60s signed URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  if (!can(session.user, "download_gpx")) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    )
  }

  const resolvedParams = await Promise.resolve(params)
  const parsedParams = RouteParamsSchema.safeParse(resolvedParams)

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid Route ID" },
      { status: 400 }
    )
  }

  const routeId = parsedParams.data.id

  const rateLimitResult = await checkRateLimit(
    `route_download:${session.user.id}`,
    RATE_LIMITS.downloadGpxPerHour,
    RATE_LIMITS.downloadGpxWindowSeconds
  )

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many download requests" },
      { status: 429 }
    )
  }

  const routeData = await getRoute(session.user.id, routeId)
  if (!routeData) {
    return NextResponse.json(
      { error: "Route not found" },
      { status: 404 }
    )
  }

  // Defense-in-depth: ensure object key is strictly scoped to the owner's prefix
  const expectedPrefix = `gpx/${session.user.id}/`
  if (!routeData.gpxObjectKey.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: "Forbidden object key" },
      { status: 403 }
    )
  }

  const safeFilename = `${routeData.name.replace(/[^a-zA-Z0-9_\s-]/g, "").trim() || "route"}.gpx`

  try {
    const downloadUrl = await signedUrl(routeData.gpxObjectKey, {
      expiresInSeconds: 60,
      downloadFilename: safeFilename,
    })

    return NextResponse.redirect(downloadUrl, 302)
  } catch (err) {
    console.error("Failed to generate signed download URL:", err)
    return NextResponse.json(
      { error: "Failed to generate download link" },
      { status: 500 }
    )
  }
}
