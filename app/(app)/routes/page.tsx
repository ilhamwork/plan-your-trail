import Link from "next/link"
import { getSession } from "@/lib/auth"
import { listRoutes } from "@/lib/db/queries/routes"
import { limits } from "@/lib/entitlements"
import { Header } from "@/components/trail/Header"
import { RoutesListClient } from "@/components/routes/RoutesListClient"
import { LogIn, UserPlus } from "lucide-react"

export const metadata = {
  title: "Rute Tersimpan | PlanYourTrail.run",
  description: "Kelola rute trail running yang telah Anda simpan.",
}

export default async function RoutesPage() {
  const session = await getSession()
  const user = session?.user

  if (!user) {
    return (
      <div className="min-h-screen bg-white pb-24 sm:pb-14">
        <Header />

        <main className="mx-auto max-w-4xl px-4 pt-10 sm:px-6 sm:pt-16 lg:px-8">
          {/* Header section (Airbnb listing page unboxed style) */}
          <div className="text-left sm:text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#2D3436] sm:text-4xl">
              Simpan & Kelola Koleksi Rute Kamu
            </h1>
            <p className="mt-3 text-base text-[#4B5563] sm:mx-auto sm:max-w-2xl">
              Masuk atau daftar akun gratis untuk menyimpan rute trail running favorit, akses prakiraan cuaca race day, dan kelola rute dari perangkat mana saja.
            </p>

            {/* Primary actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/login?returnTo=/routes"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1B4332] px-6 text-sm font-semibold text-white transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                <LogIn className="h-4 w-4" />
                <span>Masuk ke Akun</span>
              </Link>
              <Link
                href="/register?returnTo=/routes"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#2D3436] bg-white px-6 text-sm font-semibold text-[#2D3436] transition hover:bg-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
              >
                <UserPlus className="h-4 w-4" />
                <span>Daftar Akun Baru</span>
              </Link>
            </div>
          </div>

        </main>
      </div>
    )
  }

  const routes = await listRoutes(user.id)
  const userLimits = limits(user)

  return (
    <div className="min-h-screen bg-[#FAF6F1] pb-24 sm:pb-14">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#2D3436]">
            Rute Saya
          </h1>
          <p className="mt-1 text-sm text-[#4B5563]">
            Koleksi rute trail running yang tersimpan di akun kamu dan siap dianalisis kapan saja.
          </p>
        </div>

        <RoutesListClient
          initialRoutes={routes}
          maxRoutes={userLimits.maxSavedRoutes}
          currentPlan={user.plan}
        />
      </main>
    </div>
  )
}
