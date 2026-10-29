import { test, expect } from "@playwright/test"

test.describe("Sprint 6 Critical Flows: Tier Banner, Anonymous Analysis, Gating & Security", () => {
  test("tier announcement banner is visible, links to /register, and persists dismissal in sessionStorage", async ({
    page,
  }) => {
    await page.goto("/")

    const banner = page.getByRole("region", {
      name: "Pengumuman perubahan layanan",
    })
    await expect(banner).toBeVisible()
    await expect(banner).toContainText("Pembaruan Akun:")
    await expect(
      banner.getByRole("link", { name: "Daftar Akun" })
    ).toHaveAttribute("href", "/register")

    await banner.getByRole("button", { name: "Tutup pengumuman" }).click()
    await expect(banner).not.toBeVisible()

    // Reload within the same session — banner must remain dismissed (PRD 6.3)
    await page.reload()
    await expect(banner).not.toBeVisible()
  })

  test("anonymous GPX analysis displays locked states for weather, pace estimator, and waypoint management, and persists pending route on save", async ({
    page,
  }) => {
    await page.goto("/")

    // Enter guest mode
    const guestButton = page.getByRole("button", {
      name: "Mulai sebagai Tamu",
    })
    await expect(guestButton).toBeVisible({ timeout: 10000 })
    await page.getByPlaceholder("cth: Kilian Jornet").fill("Pelari Trail")
    await guestButton.click()

    // Load sample GPX
    await page.getByRole("button", { name: "Try GPX Example" }).click()

    // Verify inline gated prompt appears after analysis completes (PRD 6.3)
    const gatedPrompt = page.getByText(
      "Dapatkan analisis lebih lengkap dengan akun"
    )
    await expect(gatedPrompt).toBeVisible({ timeout: 15000 })

    // Verify locked states for Free-tier and Pro-tier features
    await expect(
      page.getByText("Buka Prakiraan Cuaca Lengkap")
    ).toBeVisible()
    await expect(
      page.getByText("Hitung Estimasi Finish Race")
    ).toBeVisible()
    await expect(page.getByText("Manajemen Waypoint")).toBeVisible()
    await expect(page.getByText("Segera Hadir di Pro").first()).toBeVisible()

    // Dismiss inline gated prompt and ensure it does not reappear in session
    await page.getByRole("button", { name: "Tutup pesan" }).click()
    await expect(gatedPrompt).not.toBeVisible()

    // Click "Simpan" as anonymous -> stores pending route in sessionStorage and redirects to /register (E4-T5)
    const saveBtn = page.getByRole("button", { name: "Simpan" })
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    await expect(page).toHaveURL(/.*\/register.*/)
    const pendingRouteRaw = await page.evaluate(() =>
      sessionStorage.getItem("pyt_pending_route")
    )
    expect(pendingRouteRaw).toBeTruthy()
  })

  test("client upload limit blocks files > 5 MB for anonymous users with exact PRD copy", async ({
    page,
  }) => {
    await page.goto("/")

    const guestButton = page.getByRole("button", {
      name: "Mulai sebagai Tamu",
    })
    await expect(guestButton).toBeVisible({ timeout: 10000 })
    await page.getByPlaceholder("cth: Kilian Jornet").fill("Pelari Trail")
    await guestButton.click()

    const fileInput = page.locator('input[type="file"][accept=".gpx"]')
    const overFiveMbBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, "a")

    await fileInput.setInputFiles({
      name: "oversized-ultra.gpx",
      mimeType: "application/gpx+xml",
      buffer: overFiveMbBuffer,
    })

    await expect(
      page.getByText(
        "File ini lebih dari 5 MB. Daftar untuk upload sampai 10 MB."
      )
    ).toBeVisible()
  })

  test("protected routes and API endpoints enforce authentication and cron secret hardening", async ({
    page,
    request,
  }) => {
    // 1. /routes redirects unauthenticated visitor to /login
    await page.goto("/routes")
    await expect(page).toHaveURL(/.*\/login.*/)

    // 2. /api/routes/[id]/gpx returns 401 when unauthenticated
    const gpxRes = await request.get(
      "/api/routes/a0000000-0000-4000-8000-000000000001/gpx",
      { maxRedirects: 0 }
    )
    expect(gpxRes.status()).toBe(401)

    // 3. /api/cron/keep-alive and /api/cron/quota-monitor reject unauthenticated requests
    const keepAliveRes = await request.get("/api/cron/keep-alive")
    expect([401, 503]).toContain(keepAliveRes.status())

    const quotaRes = await request.get("/api/cron/quota-monitor")
    expect([401, 503]).toContain(quotaRes.status())
  })
})
