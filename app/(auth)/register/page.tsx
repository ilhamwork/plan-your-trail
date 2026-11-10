"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, AlertCircle, CheckCircle, WifiOff } from "lucide-react"
import { signUp, signIn, parseAuthError, withAuthTimeout } from "@/lib/auth/client"
import { trackEvent } from "@/lib/analytics/events"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    if (typeof navigator !== "undefined") {
      setIsOffline(!navigator.onLine)
    }
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Silakan masukkan nama lengkap kamu.")
      return
    }
    if (!email || !password) {
      setError("Silakan isi semua bidang yang diperlukan.")
      return
    }
    if (password.length < 8) {
      setError("Kata sandi harus minimal 8 karakter.")
      return
    }

    setLoading(true)
    try {
      const res = await withAuthTimeout(
        signUp.email({
          name: name.trim(),
          email,
          password,
        })
      )

      if (res?.error) {
        setError(
          parseAuthError(res.error, "Gagal membuat akun. Silakan coba lagi.")
        )
        return
      }

      trackEvent("register_completed", { method: "email" })
      setSuccess(true)
    } catch (err) {
      setError(parseAuthError(err, "Gagal membuat akun. Silakan coba lagi nanti."))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError(null)
    setGoogleLoading(true)
    try {
      trackEvent("register_completed", { method: "google" })
      const res = await withAuthTimeout(
        signIn.social({
          provider: "google",
          callbackURL: "/",
        })
      )

      if (res?.error) {
        setError(
          parseAuthError(res.error, "Gagal mendaftar dengan Google. Silakan coba lagi.")
        )
        return
      }
    } catch (err) {
      setError(parseAuthError(err, "Gagal mendaftar dengan Google. Silakan periksa koneksi Anda."))
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex h-dvh flex-col items-center justify-center overflow-hidden bg-white px-4 sm:px-6">
      <div className="w-full max-w-md">
        {/* Brand mark & heading */}
        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B4332]"
          >
            <Image
              src="/text-logo.png"
              alt="PlanYourTrail"
              width={148}
              height={36}
              priority
              className="h-auto w-36"
            />
          </Link>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#2D3436]">
            Daftar Akun
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Simpan hingga 3 rute, buka cuaca per sesi, dan hitung estimasi pace.
          </p>
        </div>

        {success ? (
          <div className="mt-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-6 w-6 text-emerald-700" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[#2D3436]">
              Verifikasi Email Kamu
            </h3>
            <p className="mt-2 text-sm text-[#6B7280]">
              Kami telah mengirimkan tautan verifikasi ke{" "}
              <span className="font-semibold text-[#2D3436]">{email}</span>.
              Silakan buka email kamu dan klik tautan untuk mengaktifkan akun.
            </p>
            <div className="mt-5">
              <Link
                href="/login"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1B4332] px-4 text-base font-semibold text-[#FAF6F1] transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                Ke Halaman Masuk
              </Link>
            </div>
          </div>
        ) : (
          <>
            {isOffline && (
              <div
                role="status"
                className="mt-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-900"
              >
                <WifiOff className="h-4 w-4 shrink-0 text-amber-700" />
                <span>Tidak ada koneksi internet. Silakan periksa jaringan Anda.</span>
              </div>
            )}

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
                <label htmlFor="name" className="sr-only">
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="block h-12 w-full rounded-xl border border-[#6B7280] bg-white px-4 text-base text-[#2D3436] placeholder:text-[#6B7280] transition outline-none focus-visible:border-[#1B4332] focus-visible:ring-2 focus-visible:ring-[#1B4332]/25"
                />
              </div>

              <div>
                <label htmlFor="email" className="sr-only">
                  Alamat Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Alamat email"
                  className="block h-12 w-full rounded-xl border border-[#6B7280] bg-white px-4 text-base text-[#2D3436] placeholder:text-[#6B7280] transition outline-none focus-visible:border-[#1B4332] focus-visible:ring-2 focus-visible:ring-[#1B4332]/25"
                />
              </div>

              <div>
                <label htmlFor="password" className="sr-only">
                  Kata Sandi
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kata sandi (minimal 8 karakter)"
                  className="block h-12 w-full rounded-xl border border-[#6B7280] bg-white px-4 text-base text-[#2D3436] placeholder:text-[#6B7280] transition outline-none focus-visible:border-[#1B4332] focus-visible:ring-2 focus-visible:ring-[#1B4332]/25"
                />
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#1B4332] px-4 text-base font-semibold text-[#FAF6F1] transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Daftar Akun"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-4 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#E5E7EB]" />
              <span className="text-xs font-normal text-[#6B7280]">atau</span>
              <div className="h-px flex-1 bg-[#E5E7EB]" />
            </div>

            {/* Google OAuth tile (Airbnb style) */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading || googleLoading}
                aria-label="Daftar dengan Google"
                title="Daftar dengan Google"
                className="flex h-12 w-14 cursor-pointer items-center justify-center rounded-2xl border border-[#6B7280] bg-white transition hover:bg-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#1B4332]" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-[#6B7280]">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center px-1 font-semibold text-[#1B4332] underline underline-offset-4 hover:text-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                Masuk di sini
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
