import { describe, it, expect, vi, beforeEach } from "vitest"
import { checkRateLimit, checkCooldown } from "@/lib/rate-limit"
import { setDbForTesting } from "@/lib/db/client"

describe("lib/rate-limit: Postgres-backed Rate Limiter & Cooldown", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setDbForTesting(null)
  })

  it("allows first request and inserts new rate_limit row", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{}]),
    })

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // No existing record
        }),
      }),
    })

    setDbForTesting({
      select: mockSelect,
      insert: mockInsert,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await checkRateLimit("test-key-1", 5, 60)
    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(4)
    expect(res.resetInSeconds).toBe(60)
    expect(mockInsert).toHaveBeenCalled()
  })

  it("increments count when within active window and limit not exceeded", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{}]),
      }),
    })

    const windowStart = new Date(Date.now() - 10 * 1000) // 10 seconds ago

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              key: "test-key-2",
              windowStart,
              count: 2,
            },
          ]),
        }),
      }),
    })

    setDbForTesting({
      select: mockSelect,
      update: mockUpdate,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await checkRateLimit("test-key-2", 5, 60)
    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(2) // 5 - (2 + 1)
    expect(res.resetInSeconds).toBeLessThanOrEqual(50)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("blocks requests when limit exceeded in active window", async () => {
    const windowStart = new Date(Date.now() - 5 * 1000)

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              key: "test-key-3",
              windowStart,
              count: 5, // already at max 5
            },
          ]),
        }),
      }),
    })

    setDbForTesting({
      select: mockSelect,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await checkRateLimit("test-key-3", 5, 60)
    expect(res.allowed).toBe(false)
    expect(res.remaining).toBe(0)
    expect(res.resetInSeconds).toBeGreaterThan(0)
  })

  it("resets window when window has elapsed", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{}]),
      }),
    })

    const expiredWindowStart = new Date(Date.now() - 70 * 1000) // 70s ago (window is 60s)

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              key: "test-key-4",
              windowStart: expiredWindowStart,
              count: 5,
            },
          ]),
        }),
      }),
    })

    setDbForTesting({
      select: mockSelect,
      update: mockUpdate,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const res = await checkRateLimit("test-key-4", 5, 60)
    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(4)
    expect(res.resetInSeconds).toBe(60)
  })

  it("checkCooldown enforces minimum cooldown period (>= 60s)", async () => {
    const recentWindowStart = new Date(Date.now() - 15 * 1000) // 15s ago

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              key: "email-resend:user@example.com",
              windowStart: recentWindowStart,
              count: 1,
            },
          ]),
        }),
      }),
    })

    setDbForTesting({
      select: mockSelect,
    } as unknown as Parameters<typeof setDbForTesting>[0])

    const cooldown = await checkCooldown("email-resend:user@example.com", 60)
    expect(cooldown.allowed).toBe(false)
    expect(cooldown.remainingSeconds).toBeGreaterThan(40)
  })
})
