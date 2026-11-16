import { test, expect } from "@playwright/test"

const ARTIFACT_DIR =
  "C:/Users/90176039/.gemini/antigravity/brain/9fa41585-cf10-4543-9cd7-fefe4c3185f1/scratch"

test.describe("Route Analysis Page Revamp (Guest, i18n, Viewports)", () => {
  for (const viewport of [
    { name: "360px", width: 360, height: 800 },
    { name: "390px", width: 390, height: 844 },
    { name: "768px", width: 768, height: 1024 },
    { name: "1280px", width: 1280, height: 800 },
  ]) {
    test(`renders route analysis cleanly without overflow at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto("/")

      const guestButton = page.getByRole("button", { name: "Mulai sebagai Tamu" })
      await expect(guestButton).toBeVisible({ timeout: 10000 })
      await page.getByPlaceholder("cth: Kilian Jornet").fill("Ilham")
      await guestButton.click()

      await page
        .getByRole("button", { name: /Coba dengan rute contoh|Try with a sample route/i })
        .click()

      // Wait for route title & metrics to render
      const routeHeading = page.getByRole("heading", { level: 1, name: "Rinjani 36K" })
      await expect(routeHeading).toBeVisible({ timeout: 15000 })
      await expect(page.getByText("Dibuat oleh Ilham")).toBeVisible()
      await expect(page.getByText(/Tanggal lari:/i)).toBeVisible()

      // Verify Route Title is positioned BELOW the Elevation Chart summary
      const chartSummary = page.getByText("Panjang Rute")
      await expect(chartSummary).toBeVisible()
      const titleBox = await routeHeading.boundingBox()
      const chartSummaryBox = await chartSummary.boundingBox()
      expect(titleBox?.y).toBeGreaterThan(chartSummaryBox?.y ?? 0)

      // Check horizontal overflow
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      expect(hasOverflow).toBe(false)

      if (viewport.width === 390) {
        await page.screenshot({
          path: `${ARTIFACT_DIR}/route-390px-guest.png`,
          fullPage: true,
        })
      }
    })
  }

  test("KM-Effort tooltip, segment guide, loaded GPX size, and auth wall teaser cards work", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    const guestButton = page.getByRole("button", { name: "Mulai sebagai Tamu" })
    await expect(guestButton).toBeVisible({ timeout: 10000 })
    await page.getByPlaceholder("cth: Kilian Jornet").fill("Ilham")
    await guestButton.click()

    await page
      .getByRole("button", { name: /Coba dengan rute contoh|Try with a sample route/i })
      .click()

    await expect(page.getByRole("heading", { level: 1, name: "Rinjani 36K" })).toBeVisible({
      timeout: 15000,
    })

    // 1. KM-Effort info popover opens on tap & closes on Escape
    const effortBtn = page.getByRole("button", {
      name: "Penjelasan tentang Total Effort (KM-Effort)",
    })
    await expect(effortBtn).toBeVisible()
    const effortBox = await effortBtn.boundingBox()
    expect(effortBox?.height).toBeGreaterThanOrEqual(44)
    await effortBtn.click()
    await expect(
      page.getByText(/Jarak ekuivalen datar dengan menambahkan 1 km/i)
    ).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(
      page.getByText(/Jarak ekuivalen datar dengan menambahkan 1 km/i)
    ).toBeHidden()

    // 2. Loaded GPX card shows size + GPX dimuat + Ganti file (no upload limit line)
    await expect(page.getByText(/GPX dimuat/i)).toBeVisible()
    await expect(page.getByText("Ganti file")).toBeVisible()

    // 3. Segment grade guide toggle
    const guideBtn = page.getByRole("button", {
      name: "Lihat penjelasan kategori kemiringan segmen",
    })
    await guideBtn.click()
    await expect(page.getByText(/Tanjakan Curam \(> \+8%\)/i)).toBeVisible()

    // 4. Auth wall: 3 Contoh badges, Masuk / Daftar CTA, and secondary Daftar link
    await expect(page.getByText("Contoh", { exact: true })).toHaveCount(3)
    await expect(page.getByRole("link", { name: "Masuk / Daftar" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Daftar", exact: true })).toBeVisible()

    // 5. Donation section localized
    await expect(page.getByText("Dukung Pengembangan", { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Dukung Alat Ini" })).toBeVisible()
  })
})
