import { test, expect } from "@playwright/test"

const ARTIFACT_DIR =
  "C:/Users/90176039/.gemini/antigravity/brain/9fa41585-cf10-4543-9cd7-fefe4c3185f1/scratch"

test.describe("Home Revamp UI, Accessibility & Responsive Viewports", () => {
  for (const viewport of [
    { name: "360px", width: 360, height: 800 },
    { name: "390px", width: 390, height: 844 },
    { name: "768px", width: 768, height: 1024 },
    { name: "1280px", width: 1280, height: 800 },
  ]) {
    test(`renders cleanly without overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto("/")

      // Dismiss welcome modal as guest
      const guestButton = page.getByRole("button", { name: "Mulai sebagai Tamu" })
      await expect(guestButton).toBeVisible({ timeout: 10000 })
      await page.getByPlaceholder("cth: Kilian Jornet").fill("Ilham")
      await guestButton.click()

      // Single h1 value prop above upload zone
      const h1 = page.locator("h1")
      await expect(h1).toHaveCount(1)
      await expect(h1).toBeVisible()

      // Dropzone button + sample route button >= 48px
      const sampleBtn = page.getByRole("button", {
        name: /Try with a sample route|Coba dengan rute contoh/i,
      })
      await expect(sampleBtn).toBeVisible()
      const sampleBox = await sampleBtn.boundingBox()
      expect(sampleBox?.height).toBeGreaterThanOrEqual(48)

      // Privacy hint
      await expect(
        page.getByText(/File GPX diproses di browser Anda|Your GPX is parsed in your browser/i)
      ).toBeVisible()

      // Check horizontal overflow
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      expect(hasOverflow).toBe(false)

      // Save screenshots for 390px and 1280px
      if (viewport.width === 390 || viewport.width === 1280) {
        await page.screenshot({
          path: `${ARTIFACT_DIR}/home-${viewport.name}.png`,
          fullPage: true,
        })
      }
    })
  }

  test("invalid file shows error state with retry button", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    const guestButton = page.getByRole("button", { name: "Mulai sebagai Tamu" })
    await expect(guestButton).toBeVisible({ timeout: 10000 })
    await page.getByPlaceholder("cth: Kilian Jornet").fill("Ilham")
    await guestButton.click()

    // Invalid file triggers error state with retry button
    const fileInput = page.locator('input[type="file"][accept=".gpx"]')
    await fileInput.setInputFiles({
      name: "not-a-route.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello"),
    })
    const alert = page
      .getByRole("alert")
      .filter({ hasText: /Format file|Unsupported file type/i })
    await expect(alert).toBeVisible()
    await expect(
      alert.getByRole("button", { name: /Coba lagi|Try again/i })
    ).toBeVisible()
  })
})
