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
    <div className="min-h-screen bg-[#FAF6F1]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#1B4332] sm:text-3xl">
            Rute Saya
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Daftar rute trail running yang tersimpan di akun Anda.
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
