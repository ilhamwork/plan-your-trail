import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getRegisteredTourStatusAction,
  completeRegisteredTourPhaseAction,
} from "@/app/actions/tour"
import * as profileQueries from "@/lib/db/queries/profiles"
import { setSessionForTesting } from "@/lib/auth"

describe("app/actions/tour (cross-device registered tour state)", () => {
  beforeEach(() => {
    setSessionForTesting(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setSessionForTesting(null)
  })

  it("enforces userId as first parameter on profile tour queries", () => {
    expect(profileQueries.getTourStatus.length).toBe(1)
    expect(profileQueries.markRegisteredTourPhaseDone.length).toBe(2)
  })

  it("returns UNAUTHORIZED when unauthenticated", async () => {
    const getRes = await getRegisteredTourStatusAction()
    expect(getRes.ok).toBe(false)
    if (!getRes.ok) expect(getRes.error.code).toBe("UNAUTHORIZED")

    const postRes = await completeRegisteredTourPhaseAction("empty")
    expect(postRes.ok).toBe(false)
    if (!postRes.ok) expect(postRes.error.code).toBe("UNAUTHORIZED")
  })

  it("returns tour status scoped to authenticated user", async () => {
    setSessionForTesting({
      user: { id: "user-abc", email: "runner@example.com", plan: "free" },
    })

    const spy = vi
      .spyOn(profileQueries, "getTourStatus")
      .mockResolvedValue({ empty: true, analysis: false })

    const res = await getRegisteredTourStatusAction()
    expect(spy).toHaveBeenCalledWith("user-abc")
    expect(res).toEqual({ ok: true, data: { empty: true, analysis: false } })
  })

  it("validates phase input and rejects invalid values", async () => {
    setSessionForTesting({
      user: { id: "user-abc", email: "runner@example.com", plan: "free" },
    })

    const res = await completeRegisteredTourPhaseAction(
      "invalid" as "empty" | "analysis"
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe("VALIDATION_ERROR")
  })

  it("marks tour phase completed in DB for authenticated user", async () => {
    setSessionForTesting({
      user: { id: "user-abc", email: "runner@example.com", plan: "free" },
    })

    const spy = vi
      .spyOn(profileQueries, "markRegisteredTourPhaseDone")
      .mockResolvedValue({ empty: true, analysis: true })

    const res = await completeRegisteredTourPhaseAction("analysis")
    expect(spy).toHaveBeenCalledWith("user-abc", "analysis")
    expect(res).toEqual({ ok: true, data: { empty: true, analysis: true } })
  })
})
