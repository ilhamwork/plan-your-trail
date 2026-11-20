#!/usr/bin/env node

/**
 * Runner script for Daily Analytics Cron Job.
 * Usage:
 *   node scripts/run-daily-analytics.mjs [YYYY-MM-DD]
 *
 * Environment variables:
 *   CRON_SECRET (required)
 *   APP_URL or NEXT_PUBLIC_APP_URL (default: http://localhost:3000)
 */

const targetDate = process.argv[2]
const appUrl =
  process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
const cronSecret = process.env.CRON_SECRET

if (!cronSecret) {
  console.error("ERROR: CRON_SECRET environment variable is required.")
  process.exit(1)
}

const url = new URL("/api/cron/daily-analytics", appUrl)
if (targetDate) {
  url.searchParams.set("date", targetDate)
}

console.info(`[Daily Analytics] Triggering ${url.toString()}...`)

try {
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      Accept: "application/json",
    },
  })

  const body = await res.json()
  if (!res.ok || !body.ok) {
    console.error(`[Daily Analytics] FAILED with status ${res.status}:`, body)
    process.exit(1)
  }

  console.info(
    `[Daily Analytics] SUCCESS for date ${body.date} (${body.durationMs}ms)`
  )
  console.info(JSON.stringify(body.metrics, null, 2))
} catch (err) {
  console.error(
    "[Daily Analytics] Execution failed:",
    err instanceof Error ? err.message : err
  )
  process.exit(1)
}
