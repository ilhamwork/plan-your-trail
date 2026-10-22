"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import {
  InvoiceEditor,
  type InvoiceEditorInitialValues,
} from "@/components/invoice/InvoiceEditor"
import {
  createInvoiceAction,
  getNextInvoiceNumberAction,
  type SaveInvoiceInput,
} from "@/app/invoice/actions"

export default function InvoiceGenerator() {
  const router = useRouter()
  const [initialValues, setInitialValues] =
    useState<InvoiceEditorInitialValues | null>(null)

  useEffect(() => {
    async function prepare() {
      const { invoiceNumber } = await getNextInvoiceNumberAction()
      setInitialValues({
        invoiceNumber,
        invoiceDate: new Date().toISOString().split("T")[0],
        clientName: "",
        clientCompany: "",
        clientAddress: "",
        taxPercentage: 0,
        items: [
          { id: crypto.randomUUID(), description: "1x Instagram Reels", amount: 0 },
        ],
      })
    }
    prepare()
  }, [])

  const handleSubmit = async (input: SaveInvoiceInput) => {
    const { id, error } = await createInvoiceAction(input)

    if (error) {
      console.error("Error saving invoice:", error)
      alert("Failed to save invoice to database.")
      return
    }

    if (id) {
      router.push(`/invoice/${id}`)
    }
  }

  if (!initialValues) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF6F1]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <InvoiceEditor
      title="Invoice Details"
      description="Fill out the endorsement details"
      submitLabel="Save Invoice"
      submittingLabel="Saving..."
      initialValues={initialValues}
      onSubmit={handleSubmit}
    />
  )
}
