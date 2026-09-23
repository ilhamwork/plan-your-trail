"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/trail/Header"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Loader2, FileText, Pencil, Eye } from "lucide-react"

interface InvoiceRecord {
  id: string
  invoice_number: string
  invoice_date: string
  client_name: string
  client_company: string
  total_amount: number
  created_at: string
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, client_name, client_company, total_amount, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching invoices:", error)
      } else if (data) {
        setInvoices(data as InvoiceRecord[])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF6F1]">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#1B4332]">Invoices</h1>
            <p className="text-gray-500">View generated invoices.</p>
          </div>
          <Link href="/invoice/create">
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Saved Invoices</CardTitle>
            <CardDescription>A list of all invoices saved to the database.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No invoices found. Generate and save an invoice first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Invoice #</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3 text-right">Total Amount</th>
                      <th className="px-4 py-3 text-center rounded-tr-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">{inv.invoice_number}</td>
                        <td className="px-4 py-3">
                          {new Date(inv.invoice_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{inv.client_company || "—"}</td>
                        <td className="px-4 py-3">{inv.client_name || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          Rp {inv.total_amount?.toLocaleString('id-ID') || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/invoice/${inv.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-[#1B4332]">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/invoice/edit/${inv.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 px-2 text-gray-500 hover:text-[#1B4332]">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
