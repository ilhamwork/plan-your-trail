"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import {
  InvoiceEditor,
  type InvoiceEditorInitialValues,
} from "@/components/invoice/InvoiceEditor"
import {
  getInvoiceByIdAction,
  updateInvoiceAction,
  type SaveInvoiceInput,
} from "@/app/invoice/actions"

export default function EditInvoice({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { id } = use(params)

  const [loading, setLoading] = useState(true)
  const [initialValues, setInitialValues] =
    useState<InvoiceEditorInitialValues | null>(null)

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const { data, error } = await getInvoiceByIdAction(id)

        if (error) {
          console.error("Error fetching invoice:", error)
          return
        }

        if (data) {
          setInitialValues({
            invoiceNumber: data.invoice_number || "",
            invoiceDate:
              data.invoice_date || new Date().toISOString().split("T")[0],
            clientName: data.client_name || "",
            clientCompany: data.client_company || "",
            clientAddress: data.client_address || "",
            taxPercentage: data.tax_percentage || 0,
            items: data.items || [],
          })
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

  const handleSubmit = async (input: SaveInvoiceInput) => {
    const { error } = await updateInvoiceAction(id, input)

    if (error) {
      console.error("Error updating invoice:", error)
      alert("Failed to update invoice in database.")
      return
    }

    router.push(`/invoice/${id}`)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF6F1]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!initialValues) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF6F1] text-sm text-gray-500">
        Invoice not found.
      </div>
    )
  }

  return (
    <InvoiceEditor
      title="Edit Invoice"
      description="Update the endorsement details"
      submitLabel="Update Invoice"
      submittingLabel="Updating..."
      initialValues={initialValues}
      onSubmit={handleSubmit}
    />
  )
}
