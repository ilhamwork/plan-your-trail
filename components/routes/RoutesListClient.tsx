"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PlusCircle, Map, AlertCircle } from "lucide-react"
import { RouteCard } from "./RouteCard"
import { DeleteRouteModal } from "./DeleteRouteModal"
import { deleteRouteAction } from "@/app/actions/routes"
import type { Route } from "@/lib/db/schema"
import { useI18n } from "@/lib/i18n/context"

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
  const { t } = useI18n()
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
      {/* Quota & Action Bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 text-xs font-semibold text-[#2D3436] shadow-2xs">
            <span className="text-[#4B5563]">{t("account.routesUsage")}:</span>
            <span className="font-bold text-[#1B4332]">
              {maxRoutes !== null
                ? t("account.routesCount", { used: activeCount, max: maxRoutes })
                : `${activeCount} (${t("account.unlimited")})`}
            </span>
          </span>
          <span className="rounded-full bg-[#F1EDE8] px-3 py-1 text-xs font-semibold text-[#1B4332]">
            Paket {currentPlan === "pro" ? "Pro" : "Free"}
          </span>
        </div>

        <div>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1B4332] px-5 text-sm font-semibold text-[#FAF6F1] shadow-xs transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{t("routes.uploadNew")}</span>
          </Link>
        </div>
      </div>

      {/* Limit Reached Banner */}
      {isLimitReached && (
        <div
          role="status"
          className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="text-sm">
            <p className="font-semibold">{t("routes.limitReached")}</p>
          </div>
        </div>
      )}

      {/* Routes Grid or Empty State */}
      {routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-[#E5E7EB] bg-white px-6 py-14 text-center shadow-[0_6px_20px_rgba(0,0,0,0.04)] sm:px-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF6F1] text-[#1B4332]">
            <Map className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-[#2D3436]">
            {t("routes.emptyTitle")}
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-[#4B5563]">
            {t("routes.emptyDesc")}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1B4332] px-6 text-sm font-semibold text-[#FAF6F1] shadow-xs transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{t("routes.uploadNew")}</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
