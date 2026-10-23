"use server"

import { createClient } from "@supabase/supabase-js"
import { headers } from "next/headers"
import type { Database } from "@/lib/database.types"
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

/** Normalize client input into a DB row. `total_amount` from the client is ignored and recomputed. */
function toInvoiceRow(input: SaveInvoiceInput) {
  const { taxPercentage, total } = computeInvoiceTotals(
    input.items,
    input.tax_percentage
  )
  return {
    invoice_number: input.invoice_number.trim(),
    invoice_date: input.invoice_date,
    client_name: input.client_name?.trim() || "",
    client_company: input.client_company.trim(),
    client_address: input.client_address?.trim() || "",
    items: input.items,
    tax_percentage: taxPercentage,
    total_amount: total,
  }
}

function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment"
    )
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function getInvoicesAction(): Promise<{
  data: InvoiceRecord[] | null
  error: string | null
}> {
  try {
    await assertInvoiceAuth()
    const supabase = getServerSupabase()

    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, invoice_date, client_name, client_company, total_amount, created_at"
      )
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching invoices:", error)
      return { data: null, error: "Failed to fetch invoices" }
    }

    return { data: (data as InvoiceRecord[]) ?? [], error: null }
  } catch (err) {
    console.error("getInvoicesAction error:", err)
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch invoices",
    }
  }
}

const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]

/**
 * Suggest the next invoice number as INV/<month>/<year>/<seq>.
 * The sequence is derived from the highest existing sequence instead of the
 * row count, so deleting an invoice can never produce a duplicate number.
 */
export async function getNextInvoiceNumberAction(): Promise<{
  invoiceNumber: string
  error: string | null
}> {
  const now = new Date()
  const prefix = `INV/${ROMAN_MONTHS[now.getMonth()]}/${now.getFullYear()}/`
  const format = (seq: number) => `${prefix}${String(seq).padStart(3, "0")}`

  try {
    await assertInvoiceAuth()
    const supabase = getServerSupabase()

    const { data, error } = await supabase
      .from("invoices")
      .select("invoice_number")

    if (error) {
      console.error("Error reading invoice numbers:", error)
      return { invoiceNumber: format(1), error: "Failed to read invoice numbers" }
    }

    const taken = new Set((data ?? []).map((row) => row.invoice_number))
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
    const supabase = getServerSupabase()

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching invoice:", error)
      return { data: null, error: "Invoice not found" }
    }

    return { data: data as InvoiceDetail, error: null }
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

    const supabase = getServerSupabase()

    const { data, error } = await supabase
      .from("invoices")
      .insert([toInvoiceRow(input)])
      .select("id")
      .single()

    if (error) {
      console.error("Error saving invoice:", error)
      return { id: null, error: "Failed to save invoice to database" }
    }

    return { id: data?.id ?? null, error: null }
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

    const supabase = getServerSupabase()

    const { error } = await supabase
      .from("invoices")
      .update(toInvoiceRow(input))
      .eq("id", id)

    if (error) {
      console.error("Error updating invoice:", error)
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
