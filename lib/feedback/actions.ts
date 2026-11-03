"use server"

import { db } from "@/lib/db"
import { feedback } from "@/lib/db/schema"

export interface SendFeedbackInput {
  name?: string | null
  email?: string | null
  message: string
  runnerName?: string | null
}

export async function sendFeedbackAction(input: SendFeedbackInput): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const trimmedMessage = input.message.trim()
    if (!trimmedMessage) {
      return { success: false, error: "Pesan tidak boleh kosong." }
    }

    await db.insert(feedback).values({
      name: input.name?.trim() || null,
      email: input.email?.trim() || null,
      message: trimmedMessage,
      runnerName: input.runnerName?.trim() || null,
    })

    return { success: true, error: null }
  } catch (err) {
    console.error("sendFeedbackAction error:", err)
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Gagal mengirim masukan. Silakan coba lagi.",
    }
  }
}

