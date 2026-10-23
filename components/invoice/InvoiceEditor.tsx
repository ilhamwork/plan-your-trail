"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Trash2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Header } from "@/components/trail/Header"
import type { InvoiceItem, SaveInvoiceInput } from "@/app/invoice/actions"
import { computeInvoiceTotals, formatRupiah } from "@/lib/invoice/totals"

export interface InvoiceEditorInitialValues {
  invoiceNumber: string
  invoiceDate: string
  clientName: string
  clientCompany: string
  clientAddress: string
  taxPercentage: number
  items: InvoiceItem[]
}

interface InvoiceEditorProps {
  title: string
  description: string
  submitLabel: string
  submittingLabel: string
  initialValues: InvoiceEditorInitialValues
  onSubmit: (input: SaveInvoiceInput) => Promise<void>
}

type FormErrors = {
  invoiceNumber?: string
  invoiceDate?: string
  clientCompany?: string
  items?: string
  tax?: string
}

/**
 * Shared invoice form + live preview used by both the create and edit pages.
 * The parent page is responsible for loading `initialValues` and persisting
 * the result in `onSubmit`.
 */
export function InvoiceEditor({
  title,
  description,
  submitLabel,
  submittingLabel,
  initialValues,
  onSubmit,
}: InvoiceEditorProps) {
  const [clientName, setClientName] = useState(initialValues.clientName)
  const [clientCompany, setClientCompany] = useState(
    initialValues.clientCompany
  )
  const [clientAddress, setClientAddress] = useState(
    initialValues.clientAddress
  )
  const [invoiceDate, setInvoiceDate] = useState(initialValues.invoiceDate)
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialValues.invoiceNumber
  )
  const [taxPercentage, setTaxPercentage] = useState(
    initialValues.taxPercentage
  )
  const [items, setItems] = useState<InvoiceItem[]>(initialValues.items)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const clearItemsError = () => {
    if (errors.items) setErrors((prev) => ({ ...prev, items: undefined }))
  }

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: "", amount: 0 }])
    clearItemsError()
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
    clearItemsError()
  }

  const updateItem = (
    id: string,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          if (field === "amount") {
            const num = typeof value === "number" ? value : parseFloat(value) || 0
            return { ...item, amount: Math.max(0, num) }
          }
          return { ...item, [field]: value }
        }
        return item
      })
    )
    clearItemsError()
  }

  const {
    subtotal,
    taxPercentage: effectiveTax,
    taxAmount,
    total: totalAmount,
  } = computeInvoiceTotals(items, taxPercentage)

  const validate = () => {
    const newErrors: FormErrors = {}
    if (!invoiceNumber.trim()) {
      newErrors.invoiceNumber = "Invoice number is required"
    }
    if (!invoiceDate) {
      newErrors.invoiceDate = "Invoice date is required"
    }
    if (!clientCompany.trim()) {
      newErrors.clientCompany = "Client company / brand is required"
    }
    if (!items || items.length === 0) {
      newErrors.items = "Please add at least 1 item"
    } else if (items.some((item) => !item.description.trim())) {
      newErrors.items = "All items must have a description"
    } else if (items.some((item) => !item.amount || item.amount <= 0)) {
      newErrors.items = "All items must have an amount greater than 0"
    }
    if (taxPercentage < 0) {
      newErrors.tax = "Tax percentage cannot be negative"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSaving(true)
    try {
      await onSubmit({
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        client_name: clientName,
        client_company: clientCompany,
        client_address: clientAddress,
        items,
        tax_percentage: taxPercentage,
        total_amount: totalAmount,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF6F1] print:bg-white">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8 print:m-0 print:p-0">
        <div className="grid gap-8 lg:grid-cols-[350px_1fr] print:block print:w-full">
          {/* Controls (Hidden when printing) */}
          <div className="space-y-6 print:hidden">
            <Card>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Invoice Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => {
                      setInvoiceNumber(e.target.value)
                      if (errors.invoiceNumber)
                        setErrors((prev) => ({
                          ...prev,
                          invoiceNumber: undefined,
                        }))
                    }}
                    placeholder="INV-XXXX"
                    className={
                      errors.invoiceNumber
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                  />
                  {errors.invoiceNumber && (
                    <p className="text-xs text-red-500">
                      {errors.invoiceNumber}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => {
                      setInvoiceDate(e.target.value)
                      if (errors.invoiceDate)
                        setErrors((prev) => ({
                          ...prev,
                          invoiceDate: undefined,
                        }))
                    }}
                    className={
                      errors.invoiceDate
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                  />
                  {errors.invoiceDate && (
                    <p className="text-xs text-red-500">{errors.invoiceDate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Client Company / Brand{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={clientCompany}
                    onChange={(e) => {
                      setClientCompany(e.target.value)
                      if (errors.clientCompany)
                        setErrors((prev) => ({
                          ...prev,
                          clientCompany: undefined,
                        }))
                    }}
                    placeholder="e.g. Brand Name"
                    className={
                      errors.clientCompany
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                  />
                  {errors.clientCompany && (
                    <p className="text-xs text-red-500">
                      {errors.clientCompany}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Client Name{" "}
                    <span className="font-normal text-gray-400">(Optional)</span>
                  </label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Client Address{" "}
                    <span className="font-normal text-gray-400">(Optional)</span>
                  </label>
                  <Input
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="e.g. Jl. Sudirman No.1, Jakarta"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Tax (%){" "}
                    <span className="font-normal text-gray-400">(Optional)</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={taxPercentage || ""}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "E")
                        e.preventDefault()
                    }}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      setTaxPercentage(isNaN(val) ? 0 : Math.max(0, val))
                      if (errors.tax)
                        setErrors((prev) => ({ ...prev, tax: undefined }))
                    }}
                    placeholder="0"
                    className={
                      errors.tax
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                  />
                  {errors.tax && (
                    <p className="text-xs text-red-500">{errors.tax}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    Items <span className="text-red-500">*</span>
                  </CardTitle>
                  <CardDescription>Services provided (min. 1)</CardDescription>
                </div>
                <Button size="icon" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {errors.items && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-600">
                    {errors.items}
                  </div>
                )}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="relative flex flex-col gap-2 rounded-lg border bg-gray-50/50 p-3"
                  >
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="absolute -top-2 -right-2 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">
                        Description
                      </label>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                        placeholder="Service description"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">
                        Amount (IDR)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={item.amount || ""}
                        onKeyDown={(e) => {
                          if (e.key === "-" || e.key === "e" || e.key === "E")
                            e.preventDefault()
                        }}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          updateItem(
                            item.id,
                            "amount",
                            isNaN(val) ? 0 : Math.max(0, val)
                          )
                        }}
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleSubmit}
                className="w-full"
                size="lg"
                disabled={isSaving}
              >
                <Save className="mr-2 h-5 w-5" />
                {isSaving ? submittingLabel : submitLabel}
              </Button>
              <Link href="/invoice" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  View Invoice List
                </Button>
              </Link>
            </div>
          </div>

          {/* Invoice Preview (Always visible, formatted for print) */}
          <div className="rounded-xl border bg-white p-8 shadow-sm sm:p-12 print:border-none print:p-0 print:shadow-none">
            {/* Invoice Header */}
            <div className="mb-12 flex items-start justify-between">
              <div>
                <h1 className="mb-1 text-4xl font-black tracking-tighter text-[#1B4332]">
                  INVOICE
                </h1>
                <p className="font-medium text-gray-500">#{invoiceNumber}</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-gray-800">
                  @ilhamontrail
                </h2>
                <p className="text-sm text-gray-500">ilhamontrail@gmail.com</p>
              </div>
            </div>

            {/* Bill To & Date */}
            <div className="mb-12 flex items-end justify-between border-b border-gray-100 pb-8">
              <div>
                <p className="mb-2 text-sm font-semibold tracking-wider text-gray-400 uppercase">
                  Bill To
                </p>
                <h3 className="text-lg font-bold text-gray-800">
                  {clientCompany || "Client Company"}
                </h3>
                <p className="text-gray-600">{clientName}</p>
                {clientAddress && (
                  <p className="text-sm text-gray-500">{clientAddress}</p>
                )}
              </div>
              <div className="text-right">
                <p className="mb-1 text-sm font-semibold tracking-wider text-gray-400 uppercase">
                  Date
                </p>
                <p className="font-medium text-gray-800">
                  {invoiceDate
                    ? new Date(invoiceDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : ""}
                </p>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="mb-8">
              <div className="mb-4 grid grid-cols-[1fr_150px] gap-4 px-2">
                <p className="text-sm font-semibold tracking-wider text-gray-400 uppercase">
                  Description
                </p>
                <p className="text-right text-sm font-semibold tracking-wider text-gray-400 uppercase">
                  Amount
                </p>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_150px] gap-4 rounded-lg bg-gray-50 p-4"
                  >
                    <p className="font-medium text-gray-800">
                      {item.description || "—"}
                    </p>
                    <p className="text-right font-medium text-gray-800">
                      {formatRupiah(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="mb-16 flex justify-end">
              <div className="w-[300px] rounded-xl bg-[#1B4332] p-6 text-white">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-white/80">Subtotal</p>
                  <p>{formatRupiah(subtotal)}</p>
                </div>
                {effectiveTax > 0 && (
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-white/80">Tax ({effectiveTax}%)</p>
                    <p>{formatRupiah(taxAmount)}</p>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-white/20 pt-4 text-xl font-bold">
                  <p>Total</p>
                  <p>{formatRupiah(totalAmount)}</p>
                </div>
              </div>
            </div>

            {/* Footer / Payment Info */}
            <div className="border-t border-gray-100 pt-8">
              <h4 className="mb-2 font-bold text-gray-800">
                Payment Information
              </h4>
              <p className="text-sm text-gray-600">Bank BCA</p>
              <p className="text-sm text-gray-600">
                Account Number: 5405173066
              </p>
              <p className="text-sm text-gray-600">
                Account Name: Mohamad Ilham Firdaus
              </p>
              <p className="mt-6 text-xs text-gray-400 italic">
                Thank you for your business!
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Global styles for printing */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body { background: white; }
          @page { size: A4; margin: 20mm; }
        }
      `,
        }}
      />
    </div>
  )
}
