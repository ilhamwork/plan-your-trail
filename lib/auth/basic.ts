/**
 * HTTP Basic auth for the invoice area. Shared by `proxy.ts` (Edge
 * runtime) and the invoice server actions (Node runtime), so it only uses
 * APIs available in both: `atob` and `TextDecoder`, no `Buffer`.
 */

export function isInvoiceAuthBypassed(): boolean {
  return process.env.NODE_ENV === "development"
}

export function verifyInvoiceBasicAuth(authHeader: string | null): boolean {
  const expectedUser = process.env.INVOICE_ADMIN_USER
  const expectedPass = process.env.INVOICE_ADMIN_PASSWORD
  if (!expectedUser || !expectedPass) return false

  if (!authHeader || !authHeader.startsWith("Basic ")) return false

  let decoded: string
  try {
    const binary = atob(authHeader.slice(6).trim())
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
    decoded = new TextDecoder().decode(bytes)
  } catch {
    return false
  }

  const colonIndex = decoded.indexOf(":")
  if (colonIndex === -1) return false

  const user = decoded.slice(0, colonIndex)
  const pass = decoded.slice(colonIndex + 1)
  return user === expectedUser && pass === expectedPass
}
