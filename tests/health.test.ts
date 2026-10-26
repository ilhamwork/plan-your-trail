import { describe, it, expect } from "vitest"
import { GET } from "@/app/api/health/route"

describe("GET /api/health", () => {
  it("returns status ok with 200 HTTP status", async () => {
    const response = await GET()
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toEqual({ status: "ok" })
  })
})
