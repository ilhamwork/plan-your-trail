"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  PlusCircle,
  Map,
  AlertCircle,
  Search,
  ArrowUpDown,
  X,
} from "lucide-react"
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

type SortKey = "newest" | "oldest" | "longest" | "elevation" | "name"

export function RoutesListClient({
  initialRoutes,
  maxRoutes,
  currentPlan,
}: RoutesListClientProps) {
  const router = useRouter()
  const { t } = useI18n()
  const [routes, setRoutes] = useState<Route[]>(initialRoutes)
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null)

  // Filter & Sort states
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState<SortKey>("newest")
  const [showSortMenu, setShowSortMenu] = useState(false)

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

  // Filter and sort routes
  const filteredRoutes = useMemo(() => {
    let result = [...routes]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((r) => {
        const nameMatch = r.name.toLowerCase().includes(q)
        const userMatch = r.userName?.toLowerCase().includes(q)
        return nameMatch || userMatch
      })
    }

    result.sort((a, b) => {
      if (sortOption === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (sortOption === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      if (sortOption === "longest") {
        const distA =
          (a.metrics as { stats?: { totalDistance?: number } })?.stats
            ?.totalDistance || 0
        const distB =
          (b.metrics as { stats?: { totalDistance?: number } })?.stats
            ?.totalDistance || 0
        return distB - distA
      }
      if (sortOption === "elevation") {
        const gainA =
          (a.metrics as { stats?: { elevationGain?: number } })?.stats
            ?.elevationGain || 0
        const gainB =
          (b.metrics as { stats?: { elevationGain?: number } })?.stats
            ?.elevationGain || 0
        return gainB - gainA
      }
      if (sortOption === "name") {
        return a.name.localeCompare(b.name)
      }
      return 0
    })

    return result
  }, [routes, searchQuery, sortOption])

  return (
    <div>
      {/* Desktop Editorial Page Header + Quota + Upload CTA (desktop only, mobile keeps original below-search row) */}
      <div className="mb-6 hidden lg:flex lg:items-end lg:justify-between">
        <div>
          <h1 className="heading-1 text-3xl font-bold tracking-tight text-[#111827]">
            {t("routes.title")}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#4B5563]">
            <span className="font-semibold text-[#111827]">
              {maxRoutes !== null
                ? t("routes.quotaCount", { active: activeCount, max: maxRoutes })
                : t("routes.quotaCountUnlimited", { active: activeCount })}
            </span>
            <span className="text-[#9CA3AF]">·</span>
            <span className="rounded-full bg-[#F1EDE8] px-2.5 py-0.5 text-[11px] font-semibold text-[#1B4332]">
              {currentPlan === "pro" ? t("routes.planBadgePro") : t("routes.planBadgeFree")}
            </span>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#1B4332] px-4 text-xs font-semibold text-[#FAF6F1] shadow-2xs transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{t("routes.uploadBtn")}</span>
        </Link>
      </div>

      {/* 1. Search Activities Bar & Sort Action (AllTrails Pill Input + Sort Icon) */}
      <div className="relative mb-6 flex items-center gap-3 lg:max-w-lg">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("routes.searchPlaceholder")}
            className="w-full rounded-full border border-[#E5E7EB] bg-white py-2.5 pr-9 pl-10 text-sm text-[#111827] placeholder-[#9CA3AF] shadow-2xs transition focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111827]"
              title={t("routes.clearSearchAria")}
              aria-label={t("routes.clearSearchAria")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort Toggle Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSortMenu(!showSortMenu)}
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border shadow-2xs transition ${
              showSortMenu
                ? "border-[#1B4332] bg-[#FAF6F1] text-[#1B4332]"
                : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#1B4332] hover:text-[#111827]"
            }`}
            title={t("routes.sortAria")}
            aria-label={t("routes.sortAria")}
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>

          {/* Sort Dropdown */}
          {showSortMenu && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-48 rounded-2xl border border-[#E5E7EB] bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95"
            >
              <button
                type="button"
                onClick={() => {
                  setSortOption("newest")
                  setShowSortMenu(false)
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                  sortOption === "newest"
                    ? "bg-[#1B4332] text-white"
                    : "text-[#4B5563] hover:bg-[#FAF6F1] hover:text-[#111827]"
                }`}
              >
                <span>{t("routes.sortNewest")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortOption("longest")
                  setShowSortMenu(false)
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                  sortOption === "longest"
                    ? "bg-[#1B4332] text-white"
                    : "text-[#4B5563] hover:bg-[#FAF6F1] hover:text-[#111827]"
                }`}
              >
                <span>{t("routes.sortLongest")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortOption("elevation")
                  setShowSortMenu(false)
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                  sortOption === "elevation"
                    ? "bg-[#1B4332] text-white"
                    : "text-[#4B5563] hover:bg-[#FAF6F1] hover:text-[#111827]"
                }`}
              >
                <span>{t("routes.sortElevation")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortOption("name")
                  setShowSortMenu(false)
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                  sortOption === "name"
                    ? "bg-[#1B4332] text-white"
                    : "text-[#4B5563] hover:bg-[#FAF6F1] hover:text-[#111827]"
                }`}
              >
                <span>{t("routes.sortName")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortOption("oldest")
                  setShowSortMenu(false)
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                  sortOption === "oldest"
                    ? "bg-[#1B4332] text-white"
                    : "text-[#4B5563] hover:bg-[#FAF6F1] hover:text-[#111827]"
                }`}
              >
                <span>{t("routes.sortOldest")}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Mobile/Tablet Quota Status & Upload CTA (preserved below search on < lg) */}
      <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
        <div className="flex items-center gap-2 text-xs text-[#4B5563]">
          <span className="font-semibold text-[#111827]">
            {maxRoutes !== null
              ? t("routes.quotaCount", { active: activeCount, max: maxRoutes })
              : t("routes.quotaCountUnlimited", { active: activeCount })}
          </span>
          <span className="text-[#9CA3AF]">·</span>
          <span className="rounded-full bg-[#F1EDE8] px-2.5 py-0.5 text-[11px] font-semibold text-[#1B4332]">
            {currentPlan === "pro" ? t("routes.planBadgePro") : t("routes.planBadgeFree")}
          </span>
        </div>

        <Link
          href="/"
          className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full bg-[#1B4332] px-3.5 text-xs font-semibold text-[#FAF6F1] shadow-2xs transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>{t("routes.uploadBtn")}</span>
        </Link>
      </div>

      {/* Limit Reached Banner */}
      {isLimitReached && (
        <div
          role="status"
          className="mb-6 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 shadow-2xs"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
          <p className="font-medium leading-relaxed">
            {t("routes.limitReached")}
          </p>
        </div>
      )}

      {/* 3. Routes Feed (Unboxed AllTrails Style) */}
      {routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#E5E7EB] bg-white px-6 py-16 text-center text-[#2D3436] shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF6F1] text-[#1B4332]">
            <Map className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-tight text-[#111827]">
            {t("routes.emptyTitle")}
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-[#6B7280]">
            {t("routes.emptyDesc")}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#1B4332] px-6 text-sm font-bold text-white shadow-xs transition hover:bg-[#2D5A46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{t("routes.uploadNew")}</span>
          </Link>
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#E5E7EB] bg-white px-6 py-12 text-center text-[#4B5563] shadow-sm">
          <p className="text-sm text-[#4B5563]">
            {t("routes.searchEmpty", { query: searchQuery })}
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="mt-3 text-xs font-semibold text-[#1B4332] underline hover:text-[#2D5A46]"
          >
            {t("routes.resetSearch")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRoutes.map((route) => (
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
