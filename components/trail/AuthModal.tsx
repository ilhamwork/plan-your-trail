"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, LogIn } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useProfile } from "@/hooks/useProfile"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [error, setError] = useState<string | null>(null)
  const { profile, user, fetched } = useProfile()

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const urlError = searchParams.get("error")
    if (urlError === "user_not_found") {
      setError(
        "We couldn't find your account. Please register to create your profile."
      )
      setMode("signup")
      // Remove error from URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
    }
  }, [isOpen])

  // Automatically handle strict login rejection
  const isProfileMissing = fetched && user && !profile

  const handleOAuthLogin = async (provider: "google") => {
    try {
      setLoading(provider)
      setError(null)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?intent=${currentMode}`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error(`Error logging in with ${provider}:`, error)
      setLoading(null)
    }
  }

  const currentMode = isProfileMissing ? "signup" : mode

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-2000 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-8 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 cursor-pointer rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div className="mb-8 text-center text-[#1B4332]">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1B4332]/10">
                <LogIn size={32} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">
                {isProfileMissing
                  ? "Register Required"
                  : currentMode === "signin"
                    ? "Welcome Back"
                    : "Create Account"}
              </h2>
              <p className="mt-2 px-4 text-sm font-medium text-gray-500">
                {currentMode === "signin"
                  ? "Sign in to access your saved trails"
                  : "Join our community of trail runners"}
              </p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 rounded-lg border border-red-100 bg-red-50 p-3 text-center text-xs font-bold text-red-600"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <button
                onClick={() => handleOAuthLogin("google")}
                disabled={!!loading}
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 font-bold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
              >
                {loading === "google" ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                {currentMode === "signin"
                  ? "Continue with Google"
                  : "Register with Google"}
              </button>
            </div>

            {!isProfileMissing && (
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                  {currentMode === "signin"
                    ? "New to Plan Your Trail?"
                    : "Already have an account?"}{" "}
                  <button
                    onClick={() => {
                      setMode(currentMode === "signin" ? "signup" : "signin")
                      setError(null)
                    }}
                    className="cursor-pointer font-bold text-[#1B4332] hover:underline"
                  >
                    {currentMode === "signin" ? "Create an account" : "Sign in"}
                  </button>
                </p>
              </div>
            )}

            <p className="mt-6 text-center text-[10px] leading-relaxed text-gray-400">
              By continued use, you agree to our{" "}
              <span className="underline">Terms of Service</span> and{" "}
              <span className="underline">Privacy Policy</span>.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
