"use client"

import { useState, useEffect } from "react"
import {
  Mountain,
  LogIn,
  LogOut,
  User,
  Map as MapIcon,
  Menu,
  X as CloseIcon,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { useProfile } from "@/hooks/useProfile"
import { AuthModal } from "./AuthModal"
import { LogoutConfirmModal } from "./LogoutConfirmModal"

interface HeaderProps {
  isAuthModalOpen: boolean
  onAuthModalOpenChange: (open: boolean) => void
  onOpenSavedRoutes: () => void
}

export function Header({
  isAuthModalOpen,
  onAuthModalOpenChange,
  onOpenSavedRoutes,
}: HeaderProps) {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const { profile, fetched } = useProfile()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Guide user to register if they log in but have no profile
  useEffect(() => {
    if (fetched && user && !profile) {
      onAuthModalOpenChange(true)
    }
  }, [fetched, user, profile, onAuthModalOpenChange])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsLogoutModalOpen(false)
  }

  const getInitials = (name: string) => {
    if (!name) return "R"
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const userInitials = getInitials(
    profile?.full_name || profile?.username || "Runner"
  )

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-1001 border-b border-[#1B4332]/10 bg-[#1B4332] shadow-md"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <Mountain className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg leading-tight font-bold tracking-tight text-white">
                Plan Your Trail
              </h1>
              <p className="text-[10px] font-medium tracking-wider text-white/50">
                GPX Route Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop Navigation */}
            <div className="hidden items-center gap-3 sm:flex">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#1B4332] text-[11px] font-bold text-white ring-2 ring-white/10">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || "User"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{userInitials}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-white/80">
                      {profile?.full_name || profile?.username || "Runner"}
                    </span>
                  </div>
                  <button
                    onClick={onOpenSavedRoutes}
                    className="flex cursor-pointer items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    <MapIcon className="h-3.5 w-3.5" />
                    <span>My Routes</span>
                  </button>
                  <button
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onAuthModalOpenChange(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#1B4332] shadow-sm transition-all hover:bg-gray-100 active:scale-95"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile View */}
            <div className="flex items-center gap-2 sm:hidden">
              {!user ? (
                <button
                  onClick={() => onAuthModalOpenChange(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#1B4332] shadow-sm transition-all hover:bg-gray-100 active:scale-95"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </button>
              ) : (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="flex items-center justify-center rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10"
                >
                  {isMobileMenuOpen ? (
                    <CloseIcon className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/5 bg-[#1B4332] sm:hidden"
            >
              <div className="flex flex-col gap-1 p-4">
                {user && (
                  <div className="mb-2 flex items-center gap-3 border-b border-white/5 pb-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#1B4332] text-xs font-bold text-white ring-2 ring-white/10">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || "User"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{userInitials}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">
                        {profile?.full_name || profile?.username || "Runner"}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    onOpenSavedRoutes()
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <MapIcon className="h-4 w-4" />
                  My Routes
                </button>
                <button
                  onClick={() => {
                    setIsLogoutModalOpen(true)
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleSignOut}
      />
    </>
  )
}
