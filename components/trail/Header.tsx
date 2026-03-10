"use client";

import { Mountain } from "lucide-react";
import { motion } from "framer-motion";

export function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 border-b border-[#1B4332]/10 bg-[#1B4332] shadow-md"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
          <Mountain className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-white">
          Trail Analyzer
        </h1>
      </div>
    </motion.header>
  );
}
