import { requireUser } from "@/lib/auth"
import { listRoutes } from "@/lib/db/queries/routes"
import { limits } from "@/lib/entitlements"
import { Header } from "@/components/trail/Header"
import { RoutesListClient } from "@/components/routes/RoutesListClient"

export const metadata = {
  title: "Rute Tersimpan | PlanYourTrail.run",
  description: "Kelola rute trail running yang telah Anda simpan.",
}

export default async function RoutesPage() {
  const user = await requireUser()
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
