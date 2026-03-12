"use client"

import { motion, AnimatePresence } from "framer-motion"
import { User, Flag, Calendar, Check } from "lucide-react"

export interface RouteDetailsData {
  userName: string
  routeName: string
  raceDate: string
}

interface ModalFormInfoProps {
  isOpen: boolean
  routeDetails: RouteDetailsData
  onChange: (details: RouteDetailsData) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function ModalFormInfo({
  isOpen,
  routeDetails,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ModalFormInfoProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="bg-[#1B4332] p-5 text-white">
              <h3 className="text-xl font-bold">Route Details</h3>
              <p className="mt-1 text-sm text-white/80">
                Please provide some information about this route.
              </p>
            </div>

            <form onSubmit={onSubmit} className="p-5">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-500">
                    Runner Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={routeDetails.userName}
                      onChange={(e) =>
                        onChange({
                          ...routeDetails,
                          userName: e.target.value,
                        })
                      }
                      placeholder="John Doe"
                      className="w-full rounded-lg border border-gray-200 py-2.5 pr-4 pl-9 text-sm transition-all outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-500">
                    Race / Route Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Flag className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={routeDetails.routeName}
                      onChange={(e) =>
                        onChange({
                          ...routeDetails,
                          routeName: e.target.value,
                        })
                      }
                      placeholder="e.g. Rinjani 162K"
                      className="w-full rounded-lg border border-gray-200 py-2.5 pr-4 pl-9 text-sm transition-all outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-500">
                    Race Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      required
                      value={routeDetails.raceDate}
                      onChange={(e) =>
                        onChange({
                          ...routeDetails,
                          raceDate: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 py-2.5 pr-4 pl-9 text-sm transition-all outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !routeDetails.userName ||
                    !routeDetails.routeName ||
                    !routeDetails.raceDate ||
                    isSubmitting
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E76F51] py-2.5 text-sm font-bold text-white transition-all hover:bg-[#D55A3C] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                      className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white"
                    />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Saving..." : "Continue"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
