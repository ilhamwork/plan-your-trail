import { describe, it, expect } from "vitest"
import * as schema from "@/lib/db/schema"
import fs from "node:fs"
import path from "node:path"

describe("lib/db/schema & migrations", () => {
  it("exports all Section 6 tables", () => {
    expect(schema.user).toBeDefined()
    expect(schema.session).toBeDefined()
    expect(schema.account).toBeDefined()
    expect(schema.verification).toBeDefined()
    expect(schema.profile).toBeDefined()
    expect(schema.route).toBeDefined()
    expect(schema.waitlist).toBeDefined()
    expect(schema.weatherCache).toBeDefined()
    expect(schema.rateLimit).toBeDefined()
    expect(schema.dailyAnalytics).toBeDefined()
  })

  it("committed migration enables RLS on every table without policies", () => {
    const drizzleDir = path.resolve(import.meta.dirname, "../drizzle")
    const sqlFiles = fs
      .readdirSync(drizzleDir)
      .filter((file) => file.endsWith(".sql"))

    expect(sqlFiles.length).toBeGreaterThan(0)

    const initialMigration = fs.readFileSync(
      path.join(drizzleDir, sqlFiles[0]),
      "utf8"
    )

    const expectedTables = [
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

    for (const table of expectedTables) {
      expect(initialMigration).toContain(`CREATE TABLE "${table}"`)
      expect(initialMigration).toContain(
        `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`
      )
    }

    // Must have NO policies created (blocking anon access via Data API)
    expect(initialMigration.toLowerCase()).not.toContain("create policy")
  })
})
