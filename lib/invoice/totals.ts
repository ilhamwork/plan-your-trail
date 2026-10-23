export interface InvoiceTotals {
  subtotal: number
  taxPercentage: number
  taxAmount: number
  total: number
}

const nonNegative = (value: unknown) => Math.max(0, Number(value) || 0)

/**
 * Single source of truth for invoice math. Used by the server actions when
 * persisting `total_amount` and by every UI that displays totals, so the
 * number on screen always matches the number stored in the database.
 */
export function computeInvoiceTotals(
  items: ReadonlyArray<{ amount: number }> | null | undefined,
  taxPercentage: number | null | undefined
): InvoiceTotals {
  const subtotal = (items ?? []).reduce(
    (sum, item) => sum + nonNegative(item.amount),
    0
  )
  const tax = nonNegative(taxPercentage)
  const taxAmount = (subtotal * tax) / 100
  return { subtotal, taxPercentage: tax, taxAmount, total: subtotal + taxAmount }
}

export function formatRupiah(value: number | null | undefined): string {
  return `Rp ${(value ?? 0).toLocaleString("id-ID")}`
}
