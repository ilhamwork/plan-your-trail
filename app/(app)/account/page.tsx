import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { limits } from "@/lib/entitlements"
import { SignOutButton } from "@/components/auth/SignOutButton"
import {
  CloudSun,
  MapPin,
  Clock,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react"



export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const user = await requireUser()
  const userLimits = limits(user)

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Navigation back */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Analisis</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-3 w-3" />
              Paket: {user.plan.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1B4332] text-xl font-bold text-white shadow-xs">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{user.email}</h1>
              </div>
            </div>
            <div>
              <SignOutButton />
            </div>
          </div>

          {/* Tier Limits & Benefits */}
          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Batas & Fitur Paket Kamu
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <div className="text-xs font-medium text-gray-500">
                  Batas Ukuran Upload GPX
                </div>
                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {Math.round(userLimits.maxUploadBytes / (1024 * 1024))} MB
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Dua kali lipat dari batas upload anonim (5 MB).
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <div className="text-xs font-medium text-gray-500">
                  Kapasitas Penyimpanan Rute
                </div>
                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {userLimits.maxSavedRoutes ?? "Unlimited"} Rute
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Akses rute tersimpan dari perangkat mana saja.
                </p>
              </div>
            </div>
          </div>

          {/* Active Features */}
          <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-gray-900">
              Fitur Aktif di Akun Kamu
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <CloudSun className="h-4 w-4 text-[#2A9D8F]" />
                <span>Prakiraan cuaca per sesi (Pagi, Siang, Sore, Malam) untuk setiap rute</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#E76F51]" />
                <span>Waypoint GPX dengan label jarak di chart elevasi</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#F4A261]" />
                <span>Estimasi waktu finish dasar berdasarkan input pace (min/km)</span>
              </li>
            </ul>
          </div>

          {/* Pro Teaser */}
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900">
                  Fitur Pro (Segera Hadir di 2027)
                </h4>
                <p className="mt-0.5 text-xs text-amber-800">
                  Manajemen waypoint kustom (tambah & edit pos), prakiraan cuaca per jam, cutoff estimator per checkpoint, ekspor PDF race brief,
                  dan penyimpanan rute tanpa batas.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
