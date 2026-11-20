import { describe, it, expect } from "vitest"
import { writeAuditLog } from "@/lib/db/queries/audit-log"
import { setDbForTesting } from "@/lib/db/client"

describe("lib/db/queries/audit-log", () => {
  it("should not throw error if db fails (fire-and-forget)", async () => {
    const mockDb = {
      insert: () => {
        throw new Error("Simulated DB Connection Error")
      },
    } as unknown as Parameters<typeof setDbForTesting>[0]

    setDbForTesting(mockDb)

    await expect(
      writeAuditLog({
        userId: "00000000-0000-0000-0000-000000000000",
        action: "test.action",
        entityType: "test",
        entityId: "123",
        payload: { sample: "data" },
        ipAddress: "127.0.0.1",
      })
    ).resolves.not.toThrow()

    setDbForTesting(null)
  })

  it("should write audit log successfully with mocked insert", async () => {
    let insertedValues: unknown = null
    const mockDb = {
      insert: () => ({
        values: async (vals: unknown) => {
          insertedValues = vals
          return []
        },
      }),
    } as unknown as Parameters<typeof setDbForTesting>[0]

    setDbForTesting(mockDb)

    await writeAuditLog({
      userId: "11111111-1111-1111-1111-111111111111",
      action: "route.save",
      entityType: "route",
      entityId: "route-123",
      payload: { name: "Test Route" },
      ipAddress: "192.168.1.1",
    })

    expect(insertedValues).toMatchObject({
      userId: "11111111-1111-1111-1111-111111111111",
      action: "route.save",
      entityType: "route",
      entityId: "route-123",
    })

    setDbForTesting(null)
  })
})
