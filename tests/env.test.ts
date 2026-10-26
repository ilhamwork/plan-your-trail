import { describe, it, expect, beforeEach } from "vitest"
import { env, _resetEnvForTesting } from "@/lib/env"
import { envSchema } from "@/lib/env-schema"

describe("lib/env", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    _resetEnvForTesting()
  })

  it("returns default values when minimal env is provided", () => {
    delete process.env.PORT
    const parsed = env()
    expect(parsed.PORT).toBe(3000)
    expect(["test", "development", "production"]).toContain(parsed.NODE_ENV)
  })

  it("coerces PORT string to number", () => {
    process.env.PORT = "8080"
    const parsed = env()
    expect(parsed.PORT).toBe(8080)
  })

  it("caches the parsed environment", () => {
    const first = env()
    process.env.PORT = "9999"
    const second = env()
    expect(second.PORT).toBe(first.PORT)
  })

  it("fails validation when URL is invalid", () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "not-a-valid-url",
    })
    expect(result.success).toBe(false)
  })
})
