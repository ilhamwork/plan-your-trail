"use client"

import { useEffect, useState, use, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/trail/Header"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Download, Pencil, Loader2 } from "lucide-react"
import { toPng } from "html-to-image"

interface InvoiceItem {
  id: string
  description: string
  amount: number
}

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  client_name: string
  client_company: string
  client_address: string
  items: InvoiceItem[]
  tax_percentage: number
  total_amount: number
  created_at: string
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function generateFileName(brand: string, date: string): string {
  const d = date ? new Date(date) : new Date()
  const month = MONTH_NAMES[d.getMonth()].toLowerCase()
  const year = d.getFullYear()
  const slug = (brand || 'client').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `ilhamontrail-${slug}-${month}${year}`
}

export default function InvoicePreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", id)
          .single()

        if (error) {
          console.error("Error fetching invoice:", error)
          return
        }
        setInvoice(data as Invoice)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchInvoice()
  }, [id])

  const handleSave = async () => {
    if (!invoice || !invoiceRef.current) return
    setIsSaving(true)
    try {
      const dataUrl = await toPng(invoiceRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      })
      const link = document.createElement('a')
      link.download = `${generateFileName(invoice.client_company, invoice.invoice_date)}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to save invoice:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6F1] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#FAF6F1] flex items-center justify-center">
        <p className="text-gray-500">Invoice not found.</p>
      </div>
    )
  }

  const subtotal = invoice.items?.reduce((s, i) => s + (i.amount || 0), 0) ?? 0
  const tax = invoice.tax_percentage ?? 0
  const taxAmount = (subtotal * tax) / 100
  const total = subtotal + taxAmount

  return (
    <div className="min-h-screen bg-[#FAF6F1] print:bg-white">
      {/* Action Bar — hidden when printing */}
      <div className="print:hidden">
        <Header />
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link
            href="/invoice"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Invoice List
          </Link>
          <div className="flex gap-2">
            <Link href={`/invoice/edit/${id}`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={isSaving}>
                <Download className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save to Device"}
              </Button>
          </div>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="mx-auto max-w-4xl px-4 pb-12">
        <div ref={invoiceRef} className="bg-white p-10 sm:p-16 border shadow-sm rounded-xl">
          {/* Header */}
          <div className="flex justify-between items-start mb-14">
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-[#1B4332] mb-1">INVOICE</h1>
              <p className="text-gray-500 font-medium text-lg">#{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-800">@ilhamontrail</h2>
              <p className="text-gray-500 text-sm mt-1">Endorsement & Content Creation</p>
              <p className="text-gray-500 text-sm">ilhamontrail@gmail.com</p>
            </div>
          </div>

          {/* Bill To & Date */}
          <div className="flex justify-between items-start mb-12 pb-8 border-b border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-widest">Bill To</p>
              <h3 className="text-xl font-bold text-gray-900">{invoice.client_company || "—"}</h3>
              {invoice.client_name && <p className="text-gray-600 mt-0.5">{invoice.client_name}</p>}
              {invoice.client_address && <p className="text-gray-500 text-sm mt-0.5">{invoice.client_address}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-widest">Invoice Date</p>
              <p className="font-medium text-gray-800">
                {new Date(invoice.invoice_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-10">
            <div className="grid grid-cols-[1fr_180px] gap-4 mb-3 px-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Description</p>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-right">Amount</p>
            </div>
            <div className="space-y-2">
              {invoice.items?.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_180px] gap-4 p-4 bg-gray-50 rounded-xl">
                  <p className="font-medium text-gray-800">{item.description || "—"}</p>
                  <p className="font-medium text-gray-800 text-right">
                    Rp {item.amount?.toLocaleString('id-ID') ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-16">
            <div className="w-72 space-y-3 p-6 bg-[#1B4332] text-white rounded-2xl">
              <div className="flex justify-between text-sm">
                <p className="text-white/70">Subtotal</p>
                <p>Rp {subtotal.toLocaleString('id-ID')}</p>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-sm">
                  <p className="text-white/70">Tax ({tax}%)</p>
                  <p>Rp {taxAmount.toLocaleString('id-ID')}</p>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold pt-3 border-t border-white/20">
                <p>Total</p>
                <p>Rp {total.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="border-t border-gray-100 pt-8">
            <h4 className="font-bold text-gray-800 mb-3">Payment Information</h4>
            <p className="text-sm text-gray-600">Bank BCA</p>
            <p className="text-sm text-gray-600">Account Number: 5405173066</p>
            <p className="text-sm text-gray-600">Account Name: Mohamad Ilham Firdaus</p>
            <p className="text-xs text-gray-400 mt-6 italic">Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
