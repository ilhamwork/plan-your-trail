"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { authClient, parseAuthError, withAuthTimeout } from "@/lib/auth/client"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError("Token pengaturan ulang tidak valid atau sudah kedaluwarsa.")
      return
    }

    if (password.length < 8) {
      setError("Kata sandi baru harus minimal 8 karakter.")
      return
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.")
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
          parseAuthError(res.error, "Gagal mengatur ulang kata sandi. Silakan coba lagi.")
        )
        return
      }

      setSuccess(true)
    } catch (err) {
      setError(parseAuthError(err, "Terjadi gangguan koneksi atau server. Silakan coba lagi nanti."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/">
            <div className="flex items-center gap-2 rounded-xl bg-[#1B4332] px-4 py-2 shadow-md">
              <Image
                src="/text-logo-white.png"
                alt="PlanYourTrail"
                width={140}
                height={35}
                priority
              />
            </div>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900">
          Atur Ulang Kata Sandi
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Masukkan kata sandi baru untuk akun kamu.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm sm:px-10">
          {success ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Kata Sandi Berhasil Diperbarui
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Kata sandi kamu telah berhasil diubah. Silakan masuk dengan kata sandi baru kamu.
              </p>
              <div className="mt-6">
                <Link
                  href="/login"
                  className="inline-flex w-full justify-center rounded-lg bg-[#1B4332] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#143326]"
                >
                  Masuk Sekarang
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Kata Sandi Baru
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1B4332] focus:outline-hidden focus:ring-1 focus:ring-[#1B4332]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1B4332] focus:outline-hidden focus:ring-1 focus:ring-[#1B4332]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center rounded-lg bg-[#1B4332] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#143326] focus:outline-hidden disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Simpan Kata Sandi Baru"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-[#1B4332]" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
