"use client"

import { useState } from "react"
import { Eye, Trash2, Share2, ChevronLeft, ChevronRight, Lock, FileText, Calendar } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ProGate } from "@/components/pro/ProGate"
import { UpgradePrompt } from "@/components/pro/UpgradePrompt"
import type { UserTier } from "@/lib/access-guard"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SavedRoute {
  id: string
  user_id: string
  file_name: string
  race_name: string | null
  race_date: string | null
  route_data: object
  gpx_storage_path: string | null
  file_size_bytes: number
  access_level: "read_write" | "read_only"
  deleted_at: string | null
  created_at: string
  updated_at: string
}

interface RouteListProps {
  routes: SavedRoute[]
  tier: UserTier
  onDelete: (id: string) => void
  onView: (id: string) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ---------------------------------------------------------------------------
// RouteList component
// Requirements: 5.10, 5.11, 10.1
// ---------------------------------------------------------------------------

export function RouteList({ routes, tier, onDelete, onView }: RouteListProps) {
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(routes.length / PAGE_SIZE))
  const pageRoutes = routes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleDelete = async (id: string) => {
    if (deletingId) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/routes/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error("Failed to delete route:", data)
      } else {
        onDelete(id)
        // If the current page becomes empty after deletion, go back one page
        const remainingOnPage = pageRoutes.length - 1
        if (remainingOnPage === 0 && page > 1) {
          setPage((p) => p - 1)
        }
      }
    } catch (err) {
      console.error("Delete error:", err)
    } finally {
      setDeletingId(null)
    }
  }

  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center">
        <FileText className="mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm font-semibold text-gray-500">No saved routes yet</p>
        <p className="mt-1 text-xs text-gray-400">Upload a GPX file and save it to see it here.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/60">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Route
              </th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 sm:table-cell">
                Race Date
              </th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 md:table-cell">
                Size
              </th>
              <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 md:table-cell">
                Saved
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <AnimatePresence mode="popLayout">
              {pageRoutes.map((route) => {
                const isReadOnly = route.access_level === "read_only"
                const isDeleting = deletingId === route.id

                return (
                  <motion.tr
                    key={route.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`transition-colors hover:bg-gray-50/40 ${isDeleting ? "opacity-50" : ""}`}
                  >
                    {/* Route name + badges */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#2D3436] line-clamp-1">
                            {route.race_name || route.file_name}
                          </span>
                          {/* Read-only badge — Req 5.10, 5.11 */}
                          {isReadOnly && (
                            <span
                              title="This route is read-only. Upgrade to Pro to edit."
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800"
                            >
                              <Lock className="h-2.5 w-2.5" />
                              Read Only
                            </span>
                          )}
                        </div>
                        {route.race_name && (
                          <span className="text-[11px] text-gray-400 line-clamp-1">
                            {route.file_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Race date */}
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {formatDate(route.race_date)}
                      </div>
                    </td>

                    {/* File size */}
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-xs text-gray-400">
                        {formatBytes(route.file_size_bytes)}
                      </span>
                    </td>

                    {/* Saved date */}
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-xs text-gray-400">
                        {formatDate(route.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View */}
                        <button
                          onClick={() => onView(route.id)}
                          title="View route"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-[#1B4332]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Share — Pro-gated via ProGate (Req 3.12, 11.1) */}
                        <ProGate
                          feature="share"
                          tier={tier}
                          fallback={
                            <UpgradePrompt
                              variant="tooltip"
                              feature="share"
                              description="Upgrade to Pro to generate shareable links"
                            >
                              <button
                                disabled
                                title="Share (Pro only)"
                                className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-lg text-gray-200"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                              </button>
                            </UpgradePrompt>
                          }
                        >
                          <button
                            title="Share route"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-blue-50 hover:text-[#457B9D]"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        </ProGate>

                        {/* Delete (soft-delete) */}
                        <button
                          onClick={() => handleDelete(route.id)}
                          disabled={!!deletingId}
                          title="Delete route"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isDeleting ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/20 border-t-current" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <span className="text-xs text-gray-400">
            {routes.length} route{routes.length !== 1 ? "s" : ""}
            {" · "}Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${
                  p === page
                    ? "bg-[#1B4332] text-white"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
