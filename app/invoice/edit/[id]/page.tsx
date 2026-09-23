"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Save, Plus, Trash2, Loader2 } from "lucide-react"
import { Header } from "@/components/trail/Header"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface InvoiceItem {
  id: string
  description: string
  amount: number
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function generateFileName(brand: string, date: string): string {
  const d = date ? new Date(date) : new Date()
  const month = MONTH_NAMES[d.getMonth()].toLowerCase()
  const year = d.getFullYear()
  const slug = (brand || 'client').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `ilhamontrail-${slug}-${month}${year}`
}

export default function EditInvoice({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  const [loading, setLoading] = useState(true)
  const [clientName, setClientName] = useState("")
  const [clientCompany, setClientCompany] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0])
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [taxPercentage, setTaxPercentage] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [errors, setErrors] = useState<{
    invoiceNumber?: string
    invoiceDate?: string
    clientCompany?: string
    items?: string
    tax?: string
  }>({})

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

        if (data) {
          setClientName(data.client_name || "")
          setClientCompany(data.client_company || "")
          setClientAddress(data.client_address || "")
          setInvoiceDate(data.invoice_date || new Date().toISOString().split("T")[0])
          setInvoiceNumber(data.invoice_number || "")
          setTaxPercentage(data.tax_percentage || 0)
          setItems(data.items || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchInvoice()
    }
  }, [id])

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: "", amount: 0 }])
    if (errors.items) setErrors(prev => ({ ...prev, items: undefined }))
  }

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId))
    if (errors.items) setErrors(prev => ({ ...prev, items: undefined }))
  }

  const updateItem = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        if (field === 'amount') {
          const num = typeof value === 'number' ? value : parseFloat(value) || 0
          return { ...item, amount: Math.max(0, num) }
        }
        return { ...item, [field]: value }
      }
      return item
    }))
    if (errors.items) setErrors(prev => ({ ...prev, items: undefined }))
  }

  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0)
  const taxAmount = (subtotal * (taxPercentage || 0)) / 100
  const totalAmount = subtotal + taxAmount

  const validate = () => {
    const newErrors: typeof errors = {}
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
    } else if (items.some(item => !item.description.trim())) {
      newErrors.items = "All items must have a description"
    } else if (items.some(item => !item.amount || item.amount <= 0)) {
      newErrors.items = "All items must have an amount greater than 0"
    }
    if (taxPercentage < 0) {
      newErrors.tax = "Tax percentage cannot be negative"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleUpdate = async () => {
    if (!validate()) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          client_name: clientName,
          client_company: clientCompany,
          client_address: clientAddress,
          items: items,
          tax_percentage: taxPercentage,
          total_amount: totalAmount
        })
        .eq('id', id)

      if (error) {
        console.error("Error updating invoice:", error)
        alert("Failed to update invoice in database.")
        return
      }

      router.push(`/invoice/${id}`)
    } catch (err) {
      console.error(err)
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

  return (
    <div className="min-h-screen bg-[#FAF6F1] print:bg-white">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8 print:p-0 print:m-0">
        <div className="grid gap-8 lg:grid-cols-[350px_1fr] print:block print:w-full">
          {/* Controls (Hidden when printing) */}
          <div className="print:hidden space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Edit Invoice</CardTitle>
                <CardDescription>Update the endorsement details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice Number <span className="text-red-500">*</span></label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => {
                      setInvoiceNumber(e.target.value)
                      if (errors.invoiceNumber) setErrors(prev => ({ ...prev, invoiceNumber: undefined }))
                    }}
                    placeholder="INV-XXXX"
                    className={errors.invoiceNumber ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {errors.invoiceNumber && <p className="text-xs text-red-500">{errors.invoiceNumber}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date <span className="text-red-500">*</span></label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => {
                      setInvoiceDate(e.target.value)
                      if (errors.invoiceDate) setErrors(prev => ({ ...prev, invoiceDate: undefined }))
                    }}
                    className={errors.invoiceDate ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {errors.invoiceDate && <p className="text-xs text-red-500">{errors.invoiceDate}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client Company / Brand <span className="text-red-500">*</span></label>
                  <Input
                    value={clientCompany}
                    onChange={(e) => {
                      setClientCompany(e.target.value)
                      if (errors.clientCompany) setErrors(prev => ({ ...prev, clientCompany: undefined }))
                    }}
                    placeholder="e.g. Brand Name"
                    className={errors.clientCompany ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {errors.clientCompany && <p className="text-xs text-red-500">{errors.clientCompany}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client Name <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client Address <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <Input
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="e.g. Jl. Sudirman No.1, Jakarta"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax (%) <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={taxPercentage || ""}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault()
                    }}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      setTaxPercentage(isNaN(val) ? 0 : Math.max(0, val))
                      if (errors.tax) setErrors(prev => ({ ...prev, tax: undefined }))
                    }}
                    placeholder="0"
                    className={errors.tax ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {errors.tax && <p className="text-xs text-red-500">{errors.tax}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Items <span className="text-red-500">*</span></CardTitle>
                  <CardDescription>Services provided (min. 1)</CardDescription>
                </div>
                <Button size="icon" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {errors.items && (
                  <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-600 font-medium border border-red-200">
                    {errors.items}
                  </div>
                )}
                {items.map((item, index) => (
                  <div key={item.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-gray-50/50 relative">
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full hover:bg-red-200"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">Description</label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Service description"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">Amount (IDR)</label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={item.amount || ""}
                        onKeyDown={(e) => {
                          if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault()
                        }}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          updateItem(item.id, 'amount', isNaN(val) ? 0 : Math.max(0, val))
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
                onClick={handleUpdate}
                className="w-full"
                size="lg"
                disabled={isSaving}
              >
                <Save className="mr-2 h-5 w-5" />
                {isSaving ? "Updating..." : "Update Invoice"}
              </Button>
              <Link href="/invoice" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  View Invoice List
                </Button>
              </Link>
            </div>
          </div>

          {/* Invoice Preview (Always visible, formatted for print) */}
          <div className="bg-white p-8 sm:p-12 border shadow-sm rounded-xl print:border-none print:shadow-none print:p-0">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-[#1B4332] mb-1">INVOICE</h1>
                <p className="text-gray-500 font-medium">#{invoiceNumber}</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-gray-800">@ilhamontrail</h2>
                <p className="text-gray-500 text-sm">ilhamontrail@example.com</p>
                {/* You can add real phone/address here */}
              </div>
            </div>

            {/* Bill To & Date */}
            <div className="flex justify-between items-end mb-12 pb-8 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Bill To</p>
                <h3 className="text-lg font-bold text-gray-800">{clientCompany || "Client Company"}</h3>
                <p className="text-gray-600">{clientName || "Client Name"}</p>
                {clientAddress && <p className="text-gray-500 text-sm">{clientAddress}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-400 mb-1 uppercase tracking-wider">Date</p>
                <p className="font-medium text-gray-800">
                  {invoiceDate ? new Date(invoiceDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ""}
                </p>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="mb-8">
              <div className="grid grid-cols-[1fr_150px] gap-4 mb-4 px-2">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Description</p>
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider text-right">Amount</p>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_150px] gap-4 p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-800">{item.description || "—"}</p>
                    <p className="font-medium text-gray-800 text-right">
                      Rp {item.amount.toLocaleString('id-ID')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-end mb-16">
              <div className="w-[300px] p-6 bg-[#1B4332] text-white rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-white/80">Subtotal</p>
                  <p>Rp {subtotal.toLocaleString('id-ID')}</p>
                </div>
                {taxPercentage > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-white/80">Tax ({taxPercentage}%)</p>
                    <p>Rp {taxAmount.toLocaleString('id-ID')}</p>
                  </div>
                )}
                <div className="flex justify-between items-center text-xl font-bold pt-4 border-t border-white/20">
                  <p>Total</p>
                  <p>Rp {totalAmount.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>

            {/* Footer / Payment Info */}
            <div className="border-t border-gray-100 pt-8">
              <h4 className="font-bold text-gray-800 mb-2">Payment Information</h4>
              <p className="text-sm text-gray-600">Bank BCA</p>
              <p className="text-sm text-gray-600">Account Number: 5405173066</p>
              <p className="text-sm text-gray-600">Account Name: Mohamad Ilham Firdaus</p>
              <p className="text-xs text-gray-400 mt-6 italic">Thank you for your business!</p>
            </div>
          </div>
        </div>
      </main>

      {/* Global styles for printing */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body { background: white; }
          @page { size: A4; margin: 20mm; }
        }
      `}} />
    </div>
  )
}
