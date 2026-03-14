"use client"

import { Mountain } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"

export function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-1001 border-b border-[#1B4332]/10 bg-[#1B4332] shadow-md"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Image src="/logo.png" alt="Logo" width={24} height={24} />
        <div className="flex flex-col">
          <Image
            src="/text-logo-white.png"
            alt="Text Logo"
            width={160}
            height={40}
          />
        </div>
      </div>
    </motion.header>
  )
}
