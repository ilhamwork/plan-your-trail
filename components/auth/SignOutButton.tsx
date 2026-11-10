"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Loader2 } from "lucide-react"
import { signOut, withAuthTimeout } from "@/lib/auth/client"

interface SignOutButtonProps {
  className?: string
  children?: React.ReactNode
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      const res = await withAuthTimeout(signOut(), 8000)
      if (res?.error) {
        console.error("Sign out error:", res.error)
      }
      router.push("/login")
      router.refresh()
    } catch (e) {
      console.error("Sign out error:", e)
      // Even if network fails, redirect to login page as client-side fallback
      router.push("/login")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      aria-label="Keluar dari akun"
      className={
        className ||
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2D3436] bg-white px-4 py-2 text-sm font-semibold text-[#2D3436] transition hover:bg-[#FAF6F1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] disabled:opacity-50"
      }
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {children}
    </button>
  )
}
