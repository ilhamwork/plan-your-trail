import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"
import { env } from "../env"

export { schema }

let client: ReturnType<typeof postgres> | null = null
let dbInstance: PostgresJsDatabase<typeof schema> | null = null
let testDb: PostgresJsDatabase<typeof schema> | null = null

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (testDb) {
    return testDb
  }

  if (!dbInstance) {
    const databaseUrl = env().DATABASE_URL
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured")
    }

    // In transaction pooler mode (e.g. PgBouncer), prepared statements must be disabled
    client = postgres(databaseUrl, {
      prepare: false,
      connect_timeout: 10,
    })

    dbInstance = drizzle(client, { schema })
  }

  return dbInstance
}

export function setDbForTesting(
  mock: PostgresJsDatabase<typeof schema> | null
): void {
  testDb = mock
}

/**
 * Proxy object delegating to getDb() lazily so importing db does not immediately
 * connect or require DATABASE_URL during build/preview when unused.
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const instance = getDb()
    return Reflect.get(instance, prop, receiver)
  },
})
