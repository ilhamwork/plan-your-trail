import { test, expect } from "@playwright/test"

test("health check endpoint returns status ok", async ({ request }) => {
  const response = await request.get("/api/health")
  expect(response.ok()).toBeTruthy()
  expect(response.status()).toBe(200)

  const body = await response.json()
  expect(body).toEqual({ status: "ok" })
})
