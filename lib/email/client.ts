import { Resend } from "resend"
import { env } from "../env"
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
} from "./templates/auth-emails"
import { checkCooldown } from "../rate-limit"

let resendClient: Resend | null = null

function getResend(): Resend | null {
  if (!resendClient) {
    const apiKey = env().RESEND_API_KEY
    if (apiKey) {
      resendClient = new Resend(apiKey)
    }
  }
  return resendClient
}

export interface SendEmailResult {
  ok: boolean
  id?: string
  error?: { code: string; message: string }
}

export interface SendAuthEmailOptions {
  to: string
  url: string
  name?: string
}

/**
 * Send an email verification link via Resend.
 * Enforces >= 60 seconds cooldown per recipient.
 */
export async function sendVerificationEmail({
  to,
  url,
  name,
}: SendAuthEmailOptions): Promise<SendEmailResult> {
  const cooldownKey = `email-resend:verify:${to.toLowerCase()}`
  const cooldown = await checkCooldown(cooldownKey, 60)

  if (!cooldown.allowed) {
    return {
      ok: false,
      error: {
        code: "COOLDOWN_ACTIVE",
        message: `Harap tunggu ${cooldown.remainingSeconds} detik sebelum meminta kirim ulang email.`,
      },
    }
  }

  const { subject, html, text } = getVerificationEmailTemplate(url, name)
  return sendRawEmail({ to, subject, html, text, url })
}

/**
 * Send a password reset link via Resend.
 * Enforces >= 60 seconds cooldown per recipient.
 */
export async function sendPasswordResetEmail({
  to,
  url,
  name,
}: SendAuthEmailOptions): Promise<SendEmailResult> {
  const cooldownKey = `email-resend:reset:${to.toLowerCase()}`
  const cooldown = await checkCooldown(cooldownKey, 60)

  if (!cooldown.allowed) {
    return {
      ok: false,
      error: {
        code: "COOLDOWN_ACTIVE",
        message: `Harap tunggu ${cooldown.remainingSeconds} detik sebelum meminta kirim ulang email.`,
      },
    }
  }

  const { subject, html, text } = getPasswordResetEmailTemplate(url, name)
  return sendRawEmail({ to, subject, html, text, url })
}

async function sendRawEmail({
  to,
  subject,
  html,
  text,
  url,
}: {
  to: string
  subject: string
  html: string
  text: string
  url?: string
}): Promise<SendEmailResult> {
  const client = getResend()
  const from = env().EMAIL_FROM || "PlanYourTrail <noreply@planyourtrail.run>"

  if (!client) {
    // In dev / test or when RESEND_API_KEY is not configured
    console.info(`[Email Mock] To: ${to} | Subject: ${subject}`)
    if (url) {
      console.info(`[Email Mock Link] 👉 ${url}`)
    }
    return { ok: true, id: `mock-${Date.now()}` }
  }

  try {
    const response = await client.emails.send({
      from,
      to,
      subject,
      html,
      text,
    })

    if (response.error) {
      console.error("Resend API error:", response.error)
      if (url) {
        console.info(`[Email Link Fallback] 👉 ${url}`)
      }
      return {
        ok: false,
        error: {
          code: "RESEND_ERROR",
          message: response.error.message,
        },
      }
    }

    return { ok: true, id: response.data?.id }
  } catch (err) {
    console.error("Error sending email via Resend:", err)
    if (url) {
      console.info(`[Email Link Fallback] 👉 ${url}`)
    }
    return {
      ok: false,
      error: {
        code: "EMAIL_SEND_FAILED",
        message: err instanceof Error ? err.message : "Gagal mengirim email.",
      },
    }
  }
}
