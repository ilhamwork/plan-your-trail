"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"
import { authClient, parseAuthError, withAuthTimeout } from "@/lib/auth/client"
import { useI18n } from "@/lib/i18n/context"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { t } = useI18n()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError(t("auth.resetInvalidToken"))
      return
    }

    if (password.length < 8) {
      setError(t("auth.registerPasswordShort"))
      return
    }

    if (password !== confirmPassword) {
      setError(t("auth.resetPasswordMismatch"))
      return
    }

    setLoading(true)
    try {
      const res = await withAuthTimeout(
        authClient.resetPassword({
          newPassword: password,
          token,
        })
      )

      if (res?.error) {
        setError(
          parseAuthError(
            res.error,
            t("auth.resetError")
          )
        )
        return
      }

      setSuccess(true)
    } catch (err) {
      setError(
        parseAuthError(
          err,
          t("auth.resetNetworkError")
        )
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center bg-white px-4 py-8 sm:min-h-screen sm:px-6 sm:py-12">
      <div className="w-full max-w-md">
        {/* Brand mark & heading */}
        <div className="flex flex-col items-center text-center">
          <h1 className="mt-3 heading-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#2D3436]">
            {t("auth.resetHeading")}
          </h1>
        </div>

        {success ? (
          <div className="mt-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-6 w-6 text-emerald-700" />
            </div>
            <h2 className="mt-4 heading-2 text-xl sm:text-2xl font-bold tracking-tight text-[#2D3436]">
              {t("auth.resetSuccessTitle")}
            </h2>
            <p className="mt-2 text-subhead">
              {t("auth.resetSuccessDesc")}
            </p>
            <div className="mt-5">
              <Link
                href="/login"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1B4332] px-4 text-base font-semibold text-[#FAF6F1] transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                {t("auth.loginNowBtn")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#B91C1C]/30 bg-red-50 p-3 text-xs font-medium text-[#B91C1C]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="password" className="sr-only">
                  {t("auth.newPasswordLabel")}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.newPasswordPlaceholder")}
                  className="block h-12 w-full rounded-xl border border-[#6B7280] bg-white px-4 text-base text-[#2D3436] placeholder:text-[#6B7280] transition outline-none focus-visible:border-[#1B4332] focus-visible:ring-2 focus-visible:ring-[#1B4332]/25"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  {t("auth.confirmNewPasswordLabel")}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("auth.confirmNewPasswordPlaceholder")}
                  className="block h-12 w-full rounded-xl border border-[#6B7280] bg-white px-4 text-base text-[#2D3436] placeholder:text-[#6B7280] transition outline-none focus-visible:border-[#1B4332] focus-visible:ring-2 focus-visible:ring-[#1B4332]/25"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#1B4332] px-4 text-base font-semibold text-[#FAF6F1] transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t("auth.submitReset")
                )}
              </button>
            </form>

            <div className="mt-4 flex justify-center">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center gap-1.5 px-2 text-xs font-semibold text-[#1B4332] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t("auth.backToLogin")}</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#1B4332]" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
