import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { limits } from "@/lib/entitlements"
import { SignOutButton } from "@/components/auth/SignOutButton"
import { Header } from "@/components/trail/Header"
import {
  CloudSun,
  MapPin,
  Clock,
  Compass,
  Route as RouteIcon,
  ShieldCheck,
  ChevronRight,
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const user = await requireUser()
  const userLimits = limits(user)
  const initial = user.email.charAt(0).toUpperCase()
  const maxUploadMb = Math.round(userLimits.maxUploadBytes / (1024 * 1024))

  return (
    <div className="min-h-screen bg-[#FAF6F1] pb-24 sm:pb-14">
      <Header />

      <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        {/* Page Heading */}
        <div className="mb-8">
          <h1 className="heading-1">
            Profil
          </h1>
          <p className="mt-1 text-subhead">
            Kelola informasi akun, kuota penyimpanan rute, dan fitur analisis trail kamu.
          </p>
        </div>

        {/* Two-column Airbnb Profile Layout */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[320px_1fr] lg:gap-12">
          {/* Left Column: Airbnb Identity Card */}
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-[0_6px_20px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#1B4332] text-3xl font-bold text-[#FAF6F1] shadow-sm">
                {initial}
              </div>
              <h2 className="heading-3 mt-4 max-w-full truncate text-base sm:text-lg font-bold tracking-tight text-[#2D3436]">
                {user.email}
              </h2>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F1EDE8] px-3.5 py-1 text-xs font-semibold text-[#1B4332]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Paket {user.plan === "pro" ? "Pro" : "Free"}</span>
              </span>
            </div>

            <div className="my-6 border-t border-[#E5E7EB]" />

            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-[#4B5563]">Batas upload GPX</dt>
                <dd className="font-semibold text-[#2D3436]">{maxUploadMb} MB</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#4B5563]">Kapasitas rute</dt>
                <dd className="font-semibold text-[#2D3436]">
                  {userLimits.maxSavedRoutes ?? "Tanpa batas"}{" "}
                  {userLimits.maxSavedRoutes !== null ? "rute" : ""}
                </dd>
              </div>
            </dl>

            <div className="mt-6 space-y-2.5">
              <Link
                href="/routes"
                className="flex h-11 w-full items-center justify-between rounded-xl bg-[#FAF6F1] px-4 text-sm font-semibold text-[#1B4332] transition hover:bg-[#F1EDE8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                <span className="inline-flex items-center gap-2">
                  <RouteIcon className="h-4 w-4" />
                  <span>Lihat Rute Tersimpan</span>
                </span>
                <ChevronRight className="h-4 w-4" />
              </Link>

              <SignOutButton className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2D3436] bg-white px-4 text-sm font-semibold text-[#2D3436] transition hover:bg-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] disabled:opacity-50">
                <span>Keluar dari Akun</span>
              </SignOutButton>
            </div>
          </div>

          {/* Right Column: Quota Tiles & Feature Rows */}
          <div className="space-y-8">
            {/* Active Features List (Airbnb Settings Row Style) */}
            <section
              aria-labelledby="active-features-heading"
              className="rounded-2xl border border-[#E5E7EB] bg-white px-6 py-2"
            >
              <div className="border-b border-[#E5E7EB] py-4">
                <h2
                  id="active-features-heading"
                  className="heading-2"
                >
                  Fitur Aktif di Akun Kamu
                </h2>
              </div>

              <ul className="divide-y divide-[#E5E7EB]">
                <li className="flex items-start gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2A9D8F]/10 text-[#2A9D8F]">
                    <CloudSun className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2D3436]">
                      Prakiraan Cuaca per Sesi
                    </p>
                    <p className="mt-0.5 text-xs text-[#4B5563]">
                      Data suhu, peluang hujan, dan kecepatan angin untuk sesi Pagi, Siang, Sore, serta Malam di koordinat rute.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E76F51]/10 text-[#E76F51]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2D3436]">
                      Waypoint GPX pada Grafik Elevasi
                    </p>
                    <p className="mt-0.5 text-xs text-[#4B5563]">
                      Penanda pos pemeriksaan dan jarak kilometer tampil langsung di atas profil elevasi.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1B4332]/10 text-[#1B4332]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2D3436]">
                      Kalkulator Estimasi Waktu Finish
                    </p>
                    <p className="mt-0.5 text-xs text-[#4B5563]">
                      Perhitungan total waktu tempuh berdasarkan target pace (menit/km) dan total tanjakan rute.
                    </p>
                  </div>
                </li>
              </ul>
            </section>

            {/* Pro Roadmap Banner */}
            <section
              aria-labelledby="pro-roadmap-heading"
              className="rounded-2xl border border-[#E5E7EB] bg-white p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1EDE8] text-[#1B4332]">
                  <Compass className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      id="pro-roadmap-heading"
                      className="text-base font-bold text-[#2D3436]"
                    >
                      Rencana Fitur Pro
                    </h3>
                    <span className="rounded-full bg-[#F1EDE8] px-2.5 py-0.5 text-[11px] font-semibold text-[#1B4332]">
                      Segera Hadir 2027
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#4B5563]">
                    Manajemen waypoint kustom dan catatan nutrisi, prakiraan cuaca per jam, kalkulator cutoff time tiap pos, ekspor PDF race brief, serta kapasitas penyimpanan rute tanpa batas.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
