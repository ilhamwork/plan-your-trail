#!/usr/bin/env node

/**
 * E7 Automated Database Restore Drill Script (PRD Section 9.6 & 9.8).
 * Reads a gzipped SQL dump file, applies it to RESTORE_DATABASE_URL,
 * and verifies that all expected tables exist with Row Level Security enabled.
 */

import fs from "node:fs/promises"
import zlib from "node:zlib"
import { promisify } from "node:util"
import postgres from "postgres"

const gunzipAsync = promisify(zlib.gunzip)

export const EXPECTED_RESTORE_TABLES = [
  "account",
  "daily_analytics",
  "profile",
  "rate_limit",
  "route",
  "session",
  "user",
  "verification",
  "waitlist",
  "weather_cache",
]

export async function runRestoreDrill({
  backupFilePath = process.env.BACKUP_FILE_PATH,
  restoreDatabaseUrl = process.env.RESTORE_DATABASE_URL,
} = {}) {
  if (!backupFilePath) {
    throw new Error("BACKUP_FILE_PATH is required for the restore drill.")
  }
  if (!restoreDatabaseUrl) {
    throw new Error("RESTORE_DATABASE_URL is required for the restore drill.")
  }

  const rawBytes = await fs.readFile(backupFilePath)
  const sqlContent = backupFilePath.endsWith(".gz")
    ? (await gunzipAsync(rawBytes)).toString("utf-8")
    : rawBytes.toString("utf-8")

  const sql = postgres(restoreDatabaseUrl, { max: 1 })

  try {
    await sql.unsafe(sqlContent)

    const rows = await sql`
      SELECT c.relname AS tablename, c.relrowsecurity AS rowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname = ANY(${EXPECTED_RESTORE_TABLES})
    `

    const foundTables = new Map(rows.map((r) => [r.tablename, r.rowsecurity]))
    const missingTables = EXPECTED_RESTORE_TABLES.filter(
      (t) => !foundTables.has(t)
    )
    const rlsDisabledTables = EXPECTED_RESTORE_TABLES.filter(
      (t) => foundTables.get(t) === false
    )

    if (missingTables.length > 0) {
      throw new Error(
        `Restore drill failed: missing tables [${missingTables.join(", ")}]`
      )
    }

    if (rlsDisabledTables.length > 0) {
      throw new Error(
        `Restore drill failed: RLS disabled on [${rlsDisabledTables.join(", ")}]`
      )
    }

    console.info(
      `[Restore Drill] Verified ${EXPECTED_RESTORE_TABLES.length} tables with RLS enabled.`
    )
    return {
      ok: true,
      tablesVerified: EXPECTED_RESTORE_TABLES.length,
    }
  } finally {
    await sql.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRestoreDrill().catch((err) => {
    console.error(
      "[Restore Drill Failed]",
      err instanceof Error ? err.message : err
    )
    process.exit(1)
  })
}

