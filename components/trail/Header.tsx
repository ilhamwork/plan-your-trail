"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { User, LogIn, UserPlus, Map } from "lucide-react"
import { useSession } from "@/lib/auth/client"
import { SignOutButton } from "@/components/auth/SignOutButton"

export function Header() {
  const { data: sessionData, isPending } = useSession()
  const user = sessionData?.user

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-1001 border-b border-[#1B4332]/10 bg-[#1B4332] shadow-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/text-logo-white.png"
            alt="PlanYourTrail"
            width={160}
            height={40}
            priority
          />
        </Link>

        <div className="flex items-center gap-3">
          {isPending ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-white/10" />
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/routes"
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                title="Rute Saya"
              >
                <Map className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/account"
                className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                title="Kelola Akun"
              >
                <User className="h-3.5 w-3.5" />
              </Link>
              <SignOutButton className="rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/30">
              </SignOutButton>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/10"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Masuk</span>
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-emerald-500"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Daftar</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  )
}
