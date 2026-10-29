import { test, expect } from "@playwright/test"

test.describe("i18n Multi-language Switcher (ID & EN)", () => {
  test("default language is Indonesian and persists choice across reloads", async ({
    page,
  }) => {
    await page.goto("/")

    // Dismiss guest modal first so header is unobstructed
    const guestButton = page.getByRole("button", {
      name: "Mulai sebagai Tamu",
    })
    await expect(guestButton).toBeVisible({ timeout: 10000 })
    await page.getByPlaceholder("cth: Kilian Jornet").fill("Tester i18n")
    await guestButton.click()

    // Check language switcher exists
    const switcher = page.getByRole("group", { name: "Language selection" })
    await expect(switcher).toBeVisible()

    const btnId = switcher.getByRole("button", { name: "ID" })
    const btnEn = switcher.getByRole("button", { name: "EN" })

    // Verify default active is ID
    await expect(btnId).toHaveAttribute("aria-pressed", "true")
    await expect(btnEn).toHaveAttribute("aria-pressed", "false")

    // Verify default Indonesian copy on Header
    await expect(page.locator('header a[href="/login"]')).toContainText("Masuk")
    await expect(page.locator('header a[href="/register"]')).toContainText("Daftar")

    // Switch to English
    await btnEn.click()
    await expect(btnEn).toHaveAttribute("aria-pressed", "true")
    await expect(btnId).toHaveAttribute("aria-pressed", "false")

    // Verify English copy on Header
    await expect(page.locator('header a[href="/login"]')).toContainText("Log In")
    await expect(page.locator('header a[href="/register"]')).toContainText("Sign Up")

    // Reload page and ensure English is persisted via NEXT_LOCALE cookie
    await page.reload()
    const reloadedSwitcher = page.getByRole("group", { name: "Language selection" })
    const reloadedEn = reloadedSwitcher.getByRole("button", { name: "EN" })
    const reloadedId = reloadedSwitcher.getByRole("button", { name: "ID" })

    await expect(reloadedEn).toHaveAttribute("aria-pressed", "true")
    await expect(page.locator('header a[href="/login"]')).toContainText("Log In")

    // Switch back to Indonesian
    await reloadedId.click()
    await expect(reloadedId).toHaveAttribute("aria-pressed", "true")
    await expect(page.locator('header a[href="/login"]')).toContainText("Masuk")
  })
})
