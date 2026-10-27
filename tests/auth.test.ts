import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getSession,
  requireUser,
  signOut,
  setSessionForTesting,
  type SessionUser,
} from "@/lib/auth"
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
} from "@/lib/email/templates/auth-emails"
import { sendVerificationEmail } from "@/lib/email/client"
import { upsertProfile } from "@/lib/db/queries/profiles"
import { setDbForTesting } from "@/lib/db/client"

// Mock next/navigation redirect to simulate Next.js behavior (throwing NEXT_REDIRECT)
const mockRedirect = vi.fn().mockImplementation((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`)
})
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}))

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

describe("E2: Authentication Backend & lib/auth Contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSessionForTesting(null)
    setDbForTesting(null)
  })

  describe("lib/auth Wrapper Contract (AGENTS.md Section 5)", () => {
    it("getSession returns null when unauthenticated", async () => {
      const session = await getSession()
      expect(session).toBeNull()
    })

    it("getSession returns typed SessionUser with user plan", async () => {
      const mockUser: SessionUser = {
        id: "usr-123",
        email: "runner@example.com",
        plan: "free",
      }

      setSessionForTesting({ user: mockUser })

      const session = await getSession()
      expect(session).not.toBeNull()
      expect(session?.user.id).toBe("usr-123")
      expect(session?.user.email).toBe("runner@example.com")
      expect(session?.user.plan).toBe("free")
    })

    it("requireUser redirects to /login when unauthenticated", async () => {
      await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/login")
      expect(mockRedirect).toHaveBeenCalledWith("/login")
    })

    it("requireUser returns SessionUser when authenticated", async () => {
      const mockUser: SessionUser = {
        id: "usr-456",
        email: "ultra@example.com",
        plan: "pro",
      }

      setSessionForTesting({ user: mockUser })

      const user = await requireUser()
      expect(user.id).toBe("usr-456")
      expect(user.plan).toBe("pro")
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("signOut clears session", async () => {
      setSessionForTesting({
        user: { id: "usr-789", email: "test@example.com", plan: "free" },
      })

      await signOut()
      const session = await getSession()
      expect(session).toBeNull()
    })
  })

  describe("E2-T1: Profile row creation on signup", () => {
    it("upsertProfile defaults plan to 'free'", async () => {
      const mockReturning = vi.fn().mockResolvedValue([
        {
          userId: "new-user-id",
          plan: "free",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const mockOnConflict = vi.fn().mockReturnValue({
        returning: mockReturning,
      })

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: mockOnConflict,
        }),
      })

      setDbForTesting({
        insert: mockInsert,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const profile = await upsertProfile("new-user-id")
      expect(profile.userId).toBe("new-user-id")
      expect(profile.plan).toBe("free")
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe("E2-T3: Indonesian Email Templates & Cooldown", () => {
    it("verification email is in Bahasa Indonesia with verification link", () => {
      const template = getVerificationEmailTemplate(
        "https://planyourtrail.run/verify?token=abc123xyz",
        "Budi"
      )

      expect(template.subject).toContain("Verifikasi")
      expect(template.html).toContain("Halo Budi,")
      expect(template.html).toContain("https://planyourtrail.run/verify?token=abc123xyz")
      expect(template.html).toContain("Verifikasi Email Saya")
      expect(template.text).toContain("Terima kasih telah mendaftar di PlanYourTrail")
    })

    it("password reset email is in Bahasa Indonesia with reset link", () => {
      const template = getPasswordResetEmailTemplate(
        "https://planyourtrail.run/reset?token=xyz789",
        "Siti"
      )

      expect(template.subject).toContain("Atur ulang kata sandi")
      expect(template.html).toContain("Halo Siti,")
      expect(template.html).toContain("https://planyourtrail.run/reset?token=xyz789")
      expect(template.html).toContain("Atur Ulang Kata Sandi")
    })

    it("enforces cooldown when resend is attempted too quickly", async () => {
      // Mock active cooldown in DB
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                key: "email-resend:verify:test@example.com",
                windowStart: new Date(Date.now() - 10 * 1000), // 10s ago (<60s)
                count: 1,
              },
            ]),
          }),
        }),
      })

      setDbForTesting({
        select: mockSelect,
      } as unknown as Parameters<typeof setDbForTesting>[0])

      const res = await sendVerificationEmail({
        to: "test@example.com",
        url: "https://planyourtrail.run/verify",
      })

      expect(res.ok).toBe(false)
      expect(res.error?.code).toBe("COOLDOWN_ACTIVE")
      expect(res.error?.message).toContain("detik")
    })
  })
})
