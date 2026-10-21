"use server"

import { createClient } from "@supabase/supabase-js"
import { headers } from "next/headers"

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
  if (process.env.NODE_ENV === "development") {
    return
  }

  const expectedUser = process.env.INVOICE_ADMIN_USER
  const expectedPass = process.env.INVOICE_ADMIN_PASSWORD

  if (!expectedUser || !expectedPass) {
    throw new Error("Unauthorized: Invoice admin credentials are not configured")
  }

  const headerList = await headers()
  const authHeader = headerList.get("authorization")
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    throw new Error("Unauthorized")
  }

  const base64Credentials = authHeader.slice(6).trim()
  const decoded = Buffer.from(base64Credentials, "base64").toString("utf-8")
  const colonIndex = decoded.indexOf(":")
  if (colonIndex === -1) {
    throw new Error("Unauthorized")
  }

  const user = decoded.slice(0, colonIndex)
  const pass = decoded.slice(colonIndex + 1)

  if (user !== expectedUser || pass !== expectedPass) {
    throw new Error("Unauthorized")
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

  return createClient(supabaseUrl, serviceRoleKey, {
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

export async function getInvoiceCountAction(): Promise<{
  count: number
  error: string | null
}> {
  try {
    await assertInvoiceAuth()
    const supabase = getServerSupabase()

    const { count, error } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })

    if (error) {
      console.error("Error counting invoices:", error)
      return { count: 0, error: "Failed to count invoices" }
    }

    return { count: count ?? 0, error: null }
  } catch (err) {
    console.error("getInvoiceCountAction error:", err)
    return {
      count: 0,
      error: err instanceof Error ? err.message : "Failed to count invoices",
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

    if (
      !input.invoice_number?.trim() ||
      !input.invoice_date ||
      !input.client_company?.trim() ||
      !Array.isArray(input.items) ||
      input.items.length === 0
    ) {
      return { id: null, error: "Invalid invoice data" }
    }

    const subtotal = input.items.reduce(
      (sum, item) => sum + Math.max(0, Number(item.amount) || 0),
      0
    )
    const taxPercentage = Math.max(0, Number(input.tax_percentage) || 0)
    const totalAmount = subtotal + (subtotal * taxPercentage) / 100

    const supabase = getServerSupabase()

    const { data, error } = await supabase
      .from("invoices")
      .insert([
        {
          invoice_number: input.invoice_number.trim(),
          invoice_date: input.invoice_date,
          client_name: input.client_name?.trim() || "",
          client_company: input.client_company.trim(),
          client_address: input.client_address?.trim() || "",
          items: input.items,
          tax_percentage: taxPercentage,
          total_amount: totalAmount,
        },
      ])
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

    if (
      !id ||
      !input.invoice_number?.trim() ||
      !input.invoice_date ||
      !input.client_company?.trim() ||
      !Array.isArray(input.items) ||
      input.items.length === 0
    ) {
      return { success: false, error: "Invalid invoice data" }
    }

    const subtotal = input.items.reduce(
      (sum, item) => sum + Math.max(0, Number(item.amount) || 0),
      0
    )
    const taxPercentage = Math.max(0, Number(input.tax_percentage) || 0)
    const totalAmount = subtotal + (subtotal * taxPercentage) / 100

    const supabase = getServerSupabase()

    const { error } = await supabase
      .from("invoices")
      .update({
        invoice_number: input.invoice_number.trim(),
        invoice_date: input.invoice_date,
        client_name: input.client_name?.trim() || "",
        client_company: input.client_company.trim(),
        client_address: input.client_address?.trim() || "",
        items: input.items,
        tax_percentage: taxPercentage,
        total_amount: totalAmount,
      })
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
