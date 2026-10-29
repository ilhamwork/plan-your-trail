import { NextResponse } from "next/server"
import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/lib/auth/better-auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { RATE_LIMITS } from "@/lib/entitlements/config"

const handlers = toNextJsHandler(auth.handler)

export const GET = handlers.GET

export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1"

  const limit = await checkRateLimit(
    `auth:post:${clientIp}`,
    RATE_LIMITS.authPerMinute,
    RATE_LIMITS.authWindowSeconds
  )

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "Terlalu banyak permintaan autentikasi. Silakan tunggu sebentar.",
      },
      { status: 429 }
    )
  }

  return handlers.POST(request)
}
