import { describe, it, expect } from "vitest"
import * as schema from "@/lib/db/schema"
import fs from "node:fs"
import path from "node:path"

describe("lib/db/schema & migrations", () => {
  it("exports all Section 6 tables including savedRoute and routeAnalysis with userName", () => {
    expect(schema.user).toBeDefined()
    expect(schema.session).toBeDefined()
    expect(schema.account).toBeDefined()
    expect(schema.verification).toBeDefined()
    expect(schema.profile).toBeDefined()
    expect(schema.route).toBeDefined()
    expect(schema.savedRoute).toBeDefined()
    expect(schema.routeAnalysis).toBeDefined()
    expect(schema.savedRoute.userName).toBeDefined()
    expect(schema.routeAnalysis.userName).toBeDefined()
    expect(schema.waitlist).toBeDefined()
    expect(schema.weatherCache).toBeDefined()
    expect(schema.rateLimit).toBeDefined()
    expect(schema.dailyAnalytics).toBeDefined()
  })

  it("committed migrations enable RLS on every table without policies and add user_name", () => {
    const drizzleDir = path.resolve(import.meta.dirname, "../drizzle")
    const sqlFiles = fs
      .readdirSync(drizzleDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()

    expect(sqlFiles.length).toBeGreaterThan(0)

    const initialMigration = fs.readFileSync(
      path.join(drizzleDir, sqlFiles[0]),
      "utf8"
    )

    const expectedInitialTables = [
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

    for (const table of expectedInitialTables) {
      expect(initialMigration).toContain(`CREATE TABLE "${table}"`)
      expect(initialMigration).toContain(
        `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`
      )
    }

    // Must have NO policies created (blocking anon access via Data API)
    expect(initialMigration.toLowerCase()).not.toContain("create policy")

    // Check migration 0001
    const secondMigration = fs.readFileSync(
      path.join(drizzleDir, "0001_rename_route_and_add_route_analysis.sql"),
      "utf8"
    )

    expect(secondMigration).toMatch(/ALTER TABLE "route"\s+RENAME TO "saved_route"/i)
    expect(secondMigration).toMatch(/CREATE TABLE "route_analysis"/i)
    expect(secondMigration).toMatch(
      /ALTER TABLE "saved_route"\s+ENABLE ROW LEVEL SECURITY;/i
    )
    expect(secondMigration).toMatch(
      /ALTER TABLE "route_analysis"\s+ENABLE ROW LEVEL SECURITY;/i
    )
    expect(secondMigration.toLowerCase()).not.toContain("create policy")

    // Check migration 0002
    const thirdMigration = fs.readFileSync(
      path.join(drizzleDir, "0002_add_user_name_to_saved_route_and_route_analysis.sql"),
      "utf8"
    )

    expect(thirdMigration).toMatch(/ALTER TABLE "saved_route"\s+ADD COLUMN "user_name" text;/i)
    expect(thirdMigration).toMatch(/ALTER TABLE "route_analysis"\s+ADD COLUMN "user_name" text;/i)
  })
})
