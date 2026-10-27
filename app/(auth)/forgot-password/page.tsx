"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"
import { authClient } from "@/lib/auth/client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError("Silakan masukkan alamat email kamu.")
      return
    }

    setLoading(true)
    try {
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      })


      if (res?.error) {
        setError(res.error.message || "Gagal mengirim tautan reset. Silakan coba lagi.")
        return
      }

      setSuccess(true)
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi nanti.")
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
          Lupa Kata Sandi
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Masukkan email akun kamu untuk menerima tautan atur ulang kata sandi.
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
                Periksa Email Kamu
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Jika email <span className="font-semibold text-gray-900">{email}</span> terdaftar,
                kami telah mengirimkan petunjuk untuk mengatur ulang kata sandi.
              </p>
              <div className="mt-6">
                <Link
                  href="/login"
                  className="inline-flex w-full justify-center rounded-lg bg-[#1B4332] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#143326]"
                >
                  Kembali ke Halaman Masuk
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
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Alamat Email
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="runner@example.com"
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
                      "Kirim Tautan Atur Ulang"
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Kembali ke Halaman Masuk</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
