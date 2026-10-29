import { test, expect } from "@playwright/test"

test.describe("E2 Auth UI & Anonymous Navigation", () => {
  test("header displays login and register buttons for anonymous users", async ({
    page,
  }) => {
    await page.goto("/")
    const loginLink = page.locator('header a[href="/login"]')
    const registerLink = page.locator('header a[href="/register"]')

    await expect(loginLink).toBeVisible()
    await expect(registerLink).toBeVisible()
  })

  test("login page renders form fields and OAuth option", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("h2")).toContainText("Masuk ke Akun Kamu")
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText("Masuk")
    await expect(
      page.getByRole("button", { name: "Masuk dengan Google" })
    ).toBeVisible()
  })

  test("register page renders signup fields and links to login", async ({
    page,
  }) => {
    await page.goto("/register")
    await expect(page.locator("h2")).toContainText("Daftar Akun")
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText(
      "Daftar Akun"
    )

    await expect(
      page.getByRole("button", { name: "Daftar dengan Google" })
    ).toBeVisible()
  })

  test("account page redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto("/account")
    await expect(page).toHaveURL(/.*\/login.*/)
  })

  test("welcome modal prompts visitor to choose login or guest mode", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(
      page.getByText("Selamat Datang di PlanYourTrail")
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole("link", { name: "Masuk ke Akun" })
    ).toBeVisible()
    const guestButton = page.getByRole("button", { name: "Mulai sebagai Tamu" })
    await expect(guestButton).toBeVisible()
    await expect(guestButton).toBeDisabled()
  })

  test("anonymous user chooses guest mode and sees Pro locked state on waypoint management", async ({
    page,
  }) => {
    await page.goto("/")

    const guestButton = page.getByRole("button", {
      name: "Mulai sebagai Tamu",
    })
    await expect(guestButton).toBeVisible({ timeout: 10000 })
    await expect(guestButton).toBeDisabled()

    const nameInput = page.getByPlaceholder("cth: Kilian Jornet")
    await nameInput.fill("Runner")
    await expect(guestButton).toBeEnabled()

    await guestButton.click()
    await expect(guestButton).not.toBeVisible({ timeout: 10000 })

    await page.getByRole("button", { name: "Try GPX Example" }).click()
    await expect(
      page.getByText("Dapatkan analisis lebih lengkap dengan akun")
    ).toBeVisible({ timeout: 15000 })
    await expect(
      page.getByText("Manajemen Waypoint")
    ).toBeVisible({ timeout: 15000 })
  })
})
