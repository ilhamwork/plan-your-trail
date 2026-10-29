import crypto from "node:crypto"
import { env } from "../env"

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

/**
 * Verifies Authorization: Bearer ${CRON_SECRET} for /api/cron/* routes.
 * Uses constant-time comparison to prevent timing side-channel leaks.
 */
export function verifyCronRequest(request: Request): CronAuthResult {
  const cronSecret = env().CRON_SECRET

  if (!cronSecret || cronSecret.trim().length === 0) {
    return {
      ok: false,
      status: 503,
      error: "CRON_SECRET is not configured",
    }
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized: Missing or invalid Authorization header",
    }
  }

  const providedToken = authHeader.slice("Bearer ".length).trim()
  const expectedBuf = Buffer.from(cronSecret, "utf-8")
  const providedBuf = Buffer.from(providedToken, "utf-8")

  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized: Invalid cron secret",
    }
  }

  return { ok: true }
}

