import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import postgres from "postgres"

const EXPECTED_TABLES = [
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

describe("E1-T3: Database RLS (Row Level Security) Verification", () => {
  it("migration SQL enables RLS on all defined tables with no policies (AGENTS.md Section 6)", () => {
    const migrationPath = path.resolve(process.cwd(), "drizzle/0000_great_taskmaster.sql")
    const sqlContent = fs.readFileSync(migrationPath, "utf-8")

    for (const table of EXPECTED_TABLES) {
      const rlsRegex = new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`, "i")
      expect(
        sqlContent,
        `Expected table "${table}" to have ENABLE ROW LEVEL SECURITY in migration`
      ).toMatch(rlsRegex)
    }

    // Must not contain CREATE POLICY (AGENTS.md: RLS enabled with no policies)
    expect(sqlContent.toLowerCase()).not.toContain("create policy")
  })

  const databaseUrl = process.env.DATABASE_URL

  it.skipIf(!databaseUrl)(
    "live Postgres: proves anon/unprivileged role cannot read tables due to RLS, while owner can",
    async () => {
      const adminClient = postgres(databaseUrl!, { max: 1 })

      try {
        // 1. Verify all expected tables have relrowsecurity = true in pg_class
        const rlsStatus = await adminClient<{ tablename: string; rowsecurity: boolean }[]>`
          SELECT c.relname AS tablename, c.relrowsecurity AS rowsecurity
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relkind = 'r'
            AND c.relname = ANY(${EXPECTED_TABLES})
        `

        expect(rlsStatus.length).toBe(EXPECTED_TABLES.length)
        for (const row of rlsStatus) {
          expect(row.rowsecurity).toBe(true)
        }

        // 2. Set up a temporary unprivileged anon role without BYPASSRLS
        await adminClient.unsafe(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pyt_anon_role') THEN
              CREATE ROLE pyt_anon_role WITH LOGIN PASSWORD 'anon_pass' NOBYPASSRLS;
            END IF;
          END $$;
          GRANT USAGE ON SCHEMA public TO pyt_anon_role;
          GRANT SELECT ON ALL TABLES IN SCHEMA public TO pyt_anon_role;
        `)

        // 3. Connect as admin, insert a test user and route
        const [testUser] = await adminClient`
          INSERT INTO "user" (name, email)
          VALUES ('RLS Test User', 'rls_test@example.com')
          ON CONFLICT ("email") DO UPDATE SET name = EXCLUDED.name
          RETURNING id;
        `

        await adminClient`
          INSERT INTO "route" (user_id, name, metrics, track_simplified, gpx_object_key)
          VALUES (${testUser.id}, 'RLS Test Route', '{}'::jsonb, '[]'::jsonb, 'gpx/test.gpx')
        `

        // Owner can query and see the inserted rows
        const ownerRoutes = await adminClient`SELECT * FROM "route" WHERE user_id = ${testUser.id}`
        expect(ownerRoutes.length).toBeGreaterThan(0)

        // 4. Connect as the unprivileged anon role (URL pointing to same host/db with pyt_anon_role)
        const parsedUrl = new URL(databaseUrl!)
        parsedUrl.username = "pyt_anon_role"
        parsedUrl.password = "anon_pass"

        const anonClient = postgres(parsedUrl.toString(), { max: 1 })

        try {
          // Because RLS is enabled with NO policies, Postgres default denies all rows to non-owner
          const anonRoutes = await anonClient`SELECT * FROM "route"`
          expect(anonRoutes.length).toBe(0)

          const anonUsers = await anonClient`SELECT * FROM "user"`
          expect(anonUsers.length).toBe(0)
        } finally {
          await anonClient.end()
        }

        // Clean up inserted test rows
        await adminClient`DELETE FROM "user" WHERE id = ${testUser.id}`
      } finally {
        await adminClient.end()
      }
    }
  )
})
