"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PlusCircle, Map, AlertCircle } from "lucide-react"
import { RouteCard } from "./RouteCard"
import { DeleteRouteModal } from "./DeleteRouteModal"
import { deleteRouteAction } from "@/app/actions/routes"
import type { Route } from "@/lib/db/schema"

interface RoutesListClientProps {
  initialRoutes: Route[]
  maxRoutes: number | null
  currentPlan: "free" | "pro"
}

export function RoutesListClient({
  initialRoutes,
  maxRoutes,
  currentPlan,
}: RoutesListClientProps) {
  const router = useRouter()
  const [routes, setRoutes] = useState<Route[]>(initialRoutes)
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null)

  const activeCount = routes.length
  const isLimitReached = maxRoutes !== null && activeCount >= maxRoutes

  const handleDelete = async (routeId: string) => {
    const res = await deleteRouteAction({ routeId })
    if (!res.ok) {
      throw new Error(res.error.message)
    }

    setRoutes((prev) => prev.filter((r) => r.id !== routeId))
    router.refresh()
  }

  return (
    <div>
      {/* Quota & Limit Notice */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">
              Kapasitas Penyimpanan:
            </span>
            <span className="rounded-md bg-[#1B4332]/10 px-2 py-0.5 text-xs font-bold text-[#1B4332]">
              {maxRoutes !== null ? `${activeCount} dari ${maxRoutes} rute` : `${activeCount} rute (Unlimited)`}
            </span>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              ({currentPlan} tier)
            </span>
          </div>
        </div>

        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#2D5A46]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Upload Rute Baru</span>
          </Link>
        </div>
      </div>

      {/* Limit Reached Banner */}
      {isLimitReached && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-semibold">Batas 3 rute tercapai</p>
            <p className="mt-0.5 text-xs text-amber-800">
              Kamu sudah menyimpan 3 rute. Hapus salah satu rute, atau daftar early access Pro untuk menyimpan lebih banyak rute.
            </p>
          </div>
        </div>
      )}

      {/* Routes Grid or Empty State */}
      {routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#1B4332]">
            <Map className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-gray-900">Belum ada rute tersimpan</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Upload file GPX di halaman beranda untuk menganalisis dan menyimpan rute Anda ke akun.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2D5A46]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Upload GPX Sekarang</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              onDelete={(r) => setRouteToDelete(r)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteRouteModal
        isOpen={!!routeToDelete}
        routeName={routeToDelete?.name || ""}
        routeId={routeToDelete?.id || ""}
        onClose={() => setRouteToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
