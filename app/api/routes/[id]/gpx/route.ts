import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { can } from "@/lib/entitlements"
import { getRoute } from "@/lib/db/queries/routes"
import { signedUrl } from "@/lib/storage"

/**
 * Owner-only signed URL redirect for downloading original GPX.
 * AGENTS.md E4-T4: Redirects to signed URL with 60s expiration.
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
  const routeId = resolvedParams.id

  if (!routeId) {
    return NextResponse.json(
      { error: "Route ID is required" },
      { status: 400 }
    )
  }

  const routeData = await getRoute(session.user.id, routeId)
  if (!routeData) {
    return NextResponse.json(
      { error: "Route not found" },
      { status: 404 }
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
