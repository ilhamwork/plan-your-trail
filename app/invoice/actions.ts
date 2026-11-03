"use server"

import { eq, desc } from "drizzle-orm"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { invoices } from "@/lib/db/schema"
import { isInvoiceAuthBypassed, verifyInvoiceBasicAuth } from "@/lib/auth/basic"
import { computeInvoiceTotals } from "@/lib/invoice/totals"

export interface InvoiceItem {
  id: string
  description: string
  amount: number
}

export interface InvoiceRecord {
  id: string
  invoice_number: string
  invoice_date: string
  client_name: string
  client_company: string
  total_amount: number
  created_at: string
}

export interface InvoiceDetail extends InvoiceRecord {
  client_address: string
  items: InvoiceItem[]
  tax_percentage: number
}

export interface SaveInvoiceInput {
  invoice_number: string
  invoice_date: string
  client_name: string
  client_company: string
  client_address: string
  items: InvoiceItem[]
  tax_percentage: number
  total_amount: number
}

async function assertInvoiceAuth() {
  if (isInvoiceAuthBypassed()) return

  const headerList = await headers()
  if (!verifyInvoiceBasicAuth(headerList.get("authorization"))) {
    throw new Error("Unauthorized")
  }
}

function isValidInvoiceInput(input: SaveInvoiceInput): boolean {
  return Boolean(
    input.invoice_number?.trim() &&
      input.invoice_date &&
      input.client_company?.trim() &&
      Array.isArray(input.items) &&
      input.items.length > 0
  )
}

function toInvoiceRow(input: SaveInvoiceInput) {
  const { taxPercentage, total } = computeInvoiceTotals(
    input.items,
    input.tax_percentage
  )
  return {
    invoiceNumber: input.invoice_number.trim(),
    invoiceDate: input.invoice_date,
    clientName: input.client_name?.trim() || "",
    clientCompany: input.client_company.trim(),
    clientAddress: input.client_address?.trim() || "",
    items: input.items,
    taxPercentage: String(taxPercentage),
    totalAmount: String(total),
  }
}

export async function getInvoicesAction(): Promise<{
  data: InvoiceRecord[] | null
  error: string | null
}> {
  try {
    await assertInvoiceAuth()

    const rows = await db
      .select({
        id: invoices.id,
        invoice_number: invoices.invoiceNumber,
        invoice_date: invoices.invoiceDate,
        client_name: invoices.clientName,
        client_company: invoices.clientCompany,
        total_amount: invoices.totalAmount,
        created_at: invoices.createdAt,
      })
      .from(invoices)
      .orderBy(desc(invoices.createdAt))

    const formatted: InvoiceRecord[] = rows.map((r) => ({
      id: r.id,
      invoice_number: r.invoice_number,
      invoice_date: r.invoice_date,
      client_name: r.client_name ?? "",
      client_company: r.client_company,
      total_amount: Number(r.total_amount) || 0,
      created_at: r.created_at.toISOString(),
    }))

    return { data: formatted, error: null }
  } catch (err) {
    console.error("getInvoicesAction error:", err)
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch invoices",
    }
  }
}

const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]

export async function getNextInvoiceNumberAction(): Promise<{
  invoiceNumber: string
  error: string | null
}> {
  const now = new Date()
  const prefix = `INV/${ROMAN_MONTHS[now.getMonth()]}/${now.getFullYear()}/`
  const format = (seq: number) => `${prefix}${String(seq).padStart(3, "0")}`

  try {
    await assertInvoiceAuth()

    const rows = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)

    const taken = new Set(rows.map((row) => row.invoiceNumber))
    let maxSeq = 0
    for (const number of taken) {
      const seq = parseInt(number.split("/").pop() ?? "", 10)
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
    }

    let next = maxSeq + 1
    while (taken.has(format(next))) next++

    return { invoiceNumber: format(next), error: null }
  } catch (err) {
    console.error("getNextInvoiceNumberAction error:", err)
    return {
      invoiceNumber: format(1),
      error:
        err instanceof Error ? err.message : "Failed to generate invoice number",
    }
  }
}

export async function getInvoiceByIdAction(id: string): Promise<{
  data: InvoiceDetail | null
  error: string | null
}> {
  try {
    await assertInvoiceAuth()

    const [row] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1)

    if (!row) {
      return { data: null, error: "Invoice not found" }
    }

    const detail: InvoiceDetail = {
      id: row.id,
      invoice_number: row.invoiceNumber,
      invoice_date: row.invoiceDate,
      client_name: row.clientName ?? "",
      client_company: row.clientCompany,
      client_address: row.clientAddress ?? "",
      items: (row.items as InvoiceItem[]) ?? [],
      tax_percentage: Number(row.taxPercentage) || 0,
      total_amount: Number(row.totalAmount) || 0,
      created_at: row.createdAt.toISOString(),
    }

    return { data: detail, error: null }
  } catch (err) {
    console.error("getInvoiceByIdAction error:", err)
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch invoice",
    }
  }
}

export async function createInvoiceAction(input: SaveInvoiceInput): Promise<{
  id: string | null
  error: string | null
}> {
  try {
    await assertInvoiceAuth()

    if (!isValidInvoiceInput(input)) {
      return { id: null, error: "Invalid invoice data" }
    }

    const [created] = await db
      .insert(invoices)
      .values(toInvoiceRow(input))
      .returning({ id: invoices.id })

    return { id: created?.id ?? null, error: null }
  } catch (err) {
    console.error("createInvoiceAction error:", err)
    return {
      id: null,
      error: err instanceof Error ? err.message : "Failed to save invoice",
    }
  }
}

export async function updateInvoiceAction(
  id: string,
  input: SaveInvoiceInput
): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    await assertInvoiceAuth()

    if (!id || !isValidInvoiceInput(input)) {
      return { success: false, error: "Invalid invoice data" }
    }

    const [updated] = await db
      .update(invoices)
      .set(toInvoiceRow(input))
      .where(eq(invoices.id, id))
      .returning({ id: invoices.id })

    if (!updated) {
      return { success: false, error: "Failed to update invoice in database" }
    }

    return { success: true, error: null }
  } catch (err) {
    console.error("updateInvoiceAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update invoice",
    }
  }
}
