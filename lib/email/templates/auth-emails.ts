/**
 * Indonesian transactional email templates for PlanYourTrail.run.
 * Follows AGENTS.md rule: UI copy and emails in Bahasa Indonesia.
 */

export interface EmailTemplateResult {
  subject: string
  html: string
  text: string
}

export function getVerificationEmailTemplate(url: string, name?: string): EmailTemplateResult {
  const greeting = name ? `Halo ${name},` : "Halo,"
  const subject = "Verifikasi alamat email Anda — PlanYourTrail"

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="margin-bottom: 24px;">
      <h2 style="color: #38bdf8; margin: 0 0 8px 0; font-size: 20px;">PlanYourTrail</h2>
      <p style="color: #94a3b8; font-size: 14px; margin: 0;">Analisis Rute & Jalur Trail Running</p>
    </div>

    <p style="font-size: 16px; line-height: 24px; color: #e2e8f0; margin-bottom: 16px;">${greeting}</p>
    <p style="font-size: 15px; line-height: 22px; color: #cbd5e1; margin-bottom: 24px;">
      Terima kasih telah mendaftar di PlanYourTrail. Silakan klik tombol di bawah untuk memverifikasi alamat email Anda dan mengaktifkan akun gratis Anda.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
        Verifikasi Email Saya
      </a>
    </div>

    <p style="font-size: 13px; line-height: 20px; color: #94a3b8; margin-bottom: 8px;">
      Atau salin tautan berikut ke browser Anda:
    </p>
    <p style="font-size: 12px; color: #38bdf8; word-break: break-all; margin-bottom: 24px;">
      <a href="${url}" style="color: #38bdf8; text-decoration: underline;">${url}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />

    <p style="font-size: 12px; line-height: 18px; color: #64748b; margin: 0;">
      Jika Anda tidak merasa mendaftar di PlanYourTrail, abaikan email ini. Tautan ini akan kedaluwarsa secara otomatis.
    </p>
  </div>
</body>
</html>
  `.trim()

  const text = `
${greeting}

Terima kasih telah mendaftar di PlanYourTrail. Silakan buka tautan berikut untuk memverifikasi alamat email Anda:

${url}

Jika Anda tidak merasa mendaftar di PlanYourTrail, abaikan email ini.
  `.trim()

  return { subject, html, text }
}

export function getPasswordResetEmailTemplate(url: string, name?: string): EmailTemplateResult {
  const greeting = name ? `Halo ${name},` : "Halo,"
  const subject = "Atur ulang kata sandi Anda — PlanYourTrail"

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="margin-bottom: 24px;">
      <h2 style="color: #38bdf8; margin: 0 0 8px 0; font-size: 20px;">PlanYourTrail</h2>
      <p style="color: #94a3b8; font-size: 14px; margin: 0;">Permintaan Atur Ulang Kata Sandi</p>
    </div>

    <p style="font-size: 16px; line-height: 24px; color: #e2e8f0; margin-bottom: 16px;">${greeting}</p>
    <p style="font-size: 15px; line-height: 22px; color: #cbd5e1; margin-bottom: 24px;">
      Kami menerima permintaan untuk mengatur ulang kata sandi akun PlanYourTrail Anda. Klik tombol di bawah untuk membuat kata sandi baru.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
        Atur Ulang Kata Sandi
      </a>
    </div>

    <p style="font-size: 13px; line-height: 20px; color: #94a3b8; margin-bottom: 8px;">
      Atau salin tautan berikut ke browser Anda:
    </p>
    <p style="font-size: 12px; color: #38bdf8; word-break: break-all; margin-bottom: 24px;">
      <a href="${url}" style="color: #38bdf8; text-decoration: underline;">${url}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />

    <p style="font-size: 12px; line-height: 18px; color: #64748b; margin: 0;">
      Jika Anda tidak meminta perubahan kata sandi ini, abaikan email ini dengan aman. Kata sandi Anda tidak akan berubah.
    </p>
  </div>
</body>
</html>
  `.trim()

  const text = `
${greeting}

Kami menerima permintaan untuk mengatur ulang kata sandi akun PlanYourTrail Anda. Silakan buka tautan berikut untuk membuat kata sandi baru:

${url}

Jika Anda tidak meminta perubahan kata sandi ini, abaikan email ini.
  `.trim()

  return { subject, html, text }
}
