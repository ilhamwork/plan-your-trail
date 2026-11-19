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

  it("parses S3 / MinIO environment variables cleanly", () => {
    process.env.S3_ENDPOINT = "http://minio:9000"
    process.env.S3_BUCKET_NAME = "planyourtrail"
    process.env.S3_ACCESS_KEY_ID = "minioadmin"
    process.env.S3_SECRET_ACCESS_KEY = "minioadmin"
    const parsed = env()
    expect(parsed.S3_ENDPOINT).toBe("http://minio:9000")
    expect(parsed.S3_BUCKET_NAME).toBe("planyourtrail")
    expect(parsed.S3_ACCESS_KEY_ID).toBe("minioadmin")
    expect(parsed.S3_SECRET_ACCESS_KEY).toBe("minioadmin")
  })

  it("fails validation when URL is invalid", () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_APP_URL: "not-a-valid-url",
    })
    expect(result.success).toBe(false)
  })
})
