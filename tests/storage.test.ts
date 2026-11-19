import { describe, it, expect, beforeEach } from "vitest"
import {
  putObject,
  getObject,
  deleteObject,
  signedUrl,
  createInMemoryStorage,
  _setStorageBackendForTesting,
} from "@/lib/storage"
import { _resetEnvForTesting } from "@/lib/env"

describe("lib/storage S3 / Cloudflare R2 interface", () => {
  let fakeStorage: ReturnType<typeof createInMemoryStorage>

  beforeEach(() => {
    fakeStorage = createInMemoryStorage()
    _setStorageBackendForTesting(fakeStorage)
  })

  it("stores and retrieves raw object bytes with metadata", async () => {
    const key = "gpx/user-123/route-456.gpx.gz"
    const content = new TextEncoder().encode("gzipped gpx mock data")

    await putObject(key, content, {
      contentType: "application/gpx+xml",
      contentEncoding: "gzip",
    })

    expect(fakeStorage.files.has(key)).toBe(true)
    const stored = fakeStorage.files.get(key)
    expect(stored?.contentType).toBe("application/gpx+xml")
    expect(stored?.contentEncoding).toBe("gzip")

    const retrieved = await getObject(key)
    expect(new TextDecoder().decode(retrieved)).toBe("gzipped gpx mock data")
  })

  it("permanently deletes an object from storage", async () => {
    const key = "gpx/user-123/route-456.gpx.gz"
    await putObject(key, new Uint8Array([1, 2, 3]))

    expect(fakeStorage.files.has(key)).toBe(true)
    await deleteObject(key)
    expect(fakeStorage.files.has(key)).toBe(false)
  })

  it("generates signed URL with expiration and download filename", async () => {
    const key = "gpx/user-123/route-456.gpx.gz"
    await putObject(key, new Uint8Array([1, 2, 3]))

    const url = await signedUrl(key, {
      expiresInSeconds: 60,
      downloadFilename: "Rinjani-100.gpx",
    })

    expect(url).toContain("mock-r2.cloudflarestorage.com")
    expect(url).toContain(key)
    expect(url).toContain("expires=60")
    expect(url).toContain("filename=Rinjani-100.gpx")
  })

  it("throws when getting non-existent object", async () => {
    await expect(getObject("nonexistent.key")).rejects.toThrow("Object not found")
  })

  it("fails with informative error in production if storage credentials are missing", async () => {
    _setStorageBackendForTesting(null)
    const prevNodeEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      enumerable: true,
      configurable: true,
    })
    delete process.env.R2_ACCOUNT_ID
    delete process.env.R2_ACCESS_KEY_ID
    delete process.env.R2_SECRET_ACCESS_KEY
    delete process.env.R2_BUCKET_NAME
    delete process.env.S3_ENDPOINT
    delete process.env.S3_ACCESS_KEY_ID
    delete process.env.S3_SECRET_ACCESS_KEY
    delete process.env.S3_BUCKET_NAME
    _resetEnvForTesting()

    await expect(getObject("some-key")).rejects.toThrow(
      "Storage credentials are not configured"
    )

    Object.defineProperty(process.env, "NODE_ENV", {
      value: prevNodeEnv,
      writable: true,
      enumerable: true,
      configurable: true,
    })
    _resetEnvForTesting()
  })
})
