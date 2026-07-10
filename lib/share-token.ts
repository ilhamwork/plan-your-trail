import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Task 3.4 — Share token generation
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically secure share token with 256 bits of entropy.
 *
 * The token is 64 hexadecimal characters (32 bytes × 2 hex chars per byte).
 * This satisfies Requirements 11.2 (≥128 bits of entropy).
 *
 * Example output: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
 */
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex')
}
