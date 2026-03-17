"use client"

import { Heart } from "lucide-react"

export function DonationSection() {
  return (
    <div className="rounded-2xl border border-[#1B4332]/10 bg-white p-6 text-center">
      <div className="mb-3 flex items-center justify-center gap-2">
        <Heart className="h-5 w-5 fill-[#E76F51] text-[#E76F51]" />
        <span className="text-sm font-bold tracking-wider text-[#1B4332] uppercase">
          Support Development
        </span>
      </div>
      <p className="mx-auto mb-4 max-w-md text-sm text-gray-600">
        Planning your next adventure trail with this tool? Help support its growth
        for the trail community.
      </p>
      <a target="_blank" href="https://trakteer.id/ilhamontrail">
        <button className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#1B4332] px-8 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#2D5A46] active:scale-95">
          Fuel This Tool
        </button>
      </a>
    </div>
  )
}
