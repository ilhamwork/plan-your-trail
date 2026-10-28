import { describe, it, expect, beforeEach } from "vitest"
import {
  putObject,
  getObject,
  deleteObject,
  signedUrl,
  createInMemoryStorage,
  _setStorageBackendForTesting,
} from "@/lib/storage"

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
})
