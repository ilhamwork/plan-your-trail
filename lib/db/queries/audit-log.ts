import { createHash } from "node:crypto"
import { db } from "../client"
import { auditLog, type NewAuditLog } from "../schema"
import { logger } from "../../logger"

export interface AuditEntry {
  userId?: string | null
  action: string
  entityType?: string
  entityId?: string
  payload?: Record<string, unknown>
  ipAddress?: string | null
}

/**
 * Inserts an audit trail entry. Fire-and-forget: Catches any error and logs it,
 * never throws to avoid interrupting primary user requests.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const ipHash = entry.ipAddress
      ? createHash("sha256").update(entry.ipAddress).digest("hex").slice(0, 16)
      : null

    const values: NewAuditLog = {
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      payload: entry.payload ?? null,
      ipHash,
    }

    await db.insert(auditLog).values(values)
  } catch (err) {
    logger.error({ err, action: entry.action }, "Failed to write audit log")
  }
}
