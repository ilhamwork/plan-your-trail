"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Trash2, Map, Calendar, User, ChevronRight, FileCode } from "lucide-react"
import { SavedRoute, storage } from "@/lib/storage"
import { useEffect, useState } from "react"
import { useProfile } from "@/hooks/useProfile"

interface SavedRoutesModalProps {
  isOpen: boolean
  onClose: () => void
  onLoadRoute: (route: SavedRoute) => void
}

export function SavedRoutesModal({
  isOpen,
  onClose,
  onLoadRoute,
}: SavedRoutesModalProps) {
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const { user } = useProfile()

  useEffect(() => {
    const loadRoutes = async () => {
      if (isOpen) {
        setRoutes(await storage.getRoutes(user?.id || null))
      }
    }
    loadRoutes()
  }, [isOpen, user?.id])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await storage.deleteRoute(id)
    setRoutes(await storage.getRoutes(user?.id || null))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-1010 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#1B4332]/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-[#1B4332] p-4 text-white">
              <div>
                <h3 className="text-lg font-bold">My Routes</h3>
                <p className="text-xs text-white/60">
                  {routes.length} / 5 routes saved
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 transition-colors hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {routes.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                    <Map className="h-6 w-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">
                    No saved routes yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {routes.map((route) => (
                    <motion.div
                      key={route.id}
                      layout
                      onClick={() => {
                        onLoadRoute(route)
                        onClose()
                      }}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-[#2A9D8F]/30 hover:bg-[#2A9D8F]/5 active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-[#1B4332] group-hover:text-[#2A9D8F]">
                            {route.name}
                          </h4>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                              <User className="h-3 w-3" />
                              {route.userName}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {new Date(route.date).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 italic">
                              <FileCode className="h-3 w-3" />
                              {route.fileName}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-xs font-bold text-[#2A9D8F]">
                              {(route.stats.totalDistance / 1000).toFixed(1)} km
                            </span>
                            <span className="text-xs font-bold text-[#F4A261]">
                              +{route.stats.elevationGain} m
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <button
                            onClick={(e) => handleDelete(e, route.id)}
                            className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <ChevronRight className="h-5 w-5 text-gray-300 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            {routes.length > 0 && (
              <div className="border-t border-gray-50 bg-gray-50 p-3 text-center">
                <p className="text-[10px] font-medium text-gray-400">
                  Select a route to load its full analysis.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
