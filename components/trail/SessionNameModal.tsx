"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User } from "lucide-react"

interface SessionNameModalProps {
  isOpen: boolean
  onSubmit: (name: string) => void
}

export function SessionNameModal({ isOpen, onSubmit }: SessionNameModalProps) {
  const [name, setName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-3000 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="bg-[#1B4332] p-5 text-white">
              <h3 className="text-xl font-bold">Welcome to Plan Your Trail</h3>
              <p className="mt-1 text-sm text-white/80">
                Please enter your name to start.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
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
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-lg border border-gray-200 py-2.5 pr-4 pl-9 text-sm transition-all outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#E76F51] py-2.5 text-sm font-bold text-white transition-all hover:bg-[#D55A3C] disabled:opacity-50"
                >
                  Begin
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
