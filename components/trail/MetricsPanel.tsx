"use client"

import { useState } from "react"
import type { RouteStats } from "@/lib/types"
import {
  Mountain,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  HelpCircle,
} from "lucide-react"
import { motion } from "framer-motion"

interface MetricsPanelProps {
  stats: RouteStats
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2)
}

export function MetricsPanel({ stats }: MetricsPanelProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  const cards = [
    {
      icon: Mountain,
      label: "Total Distance",
      value: `${formatDistance(stats.totalDistance)} km`,
      color: "text-[#1B4332]",
      bg: "bg-[#1B4332]/5",
    },
    {
      icon: Zap,
      label: "Total Effort",
      value: `${(stats.totalDistance / 1000 + stats.elevationGain * 0.01).toFixed(1)} km`,
      color: "text-[#E76F51]",
      bg: "bg-[#E76F51]/5",
      tooltip: "Distance (km) + (Elevation Gain (m) / 100)",
    },
    {
      icon: TrendingUp,
      label: "Elevation Gain",
      value: `${stats.elevationGain} m`,
      color: "text-[#1B4332]",
      bg: "bg-[#1B4332]/5",
      tooltip: "Total sum of all uphill sections",
    },
    {
      icon: TrendingDown,
      label: "Elevation Loss",
      value: `${stats.elevationLoss} m`,
      color: "text-red-500",
      bg: "bg-red-50",
      tooltip: "Total sum of all downhill sections",
    },
    {
      icon: ArrowUpRight,
      label: "Highest Point",
      value: `${stats.highestPoint} m`,
      color: "text-[#2D3436]",
      bg: "bg-gray-50",
    },
    {
      icon: ArrowDownLeft,
      label: "Lowest Point",
      value: `${stats.lowestPoint} m`,
      color: "text-[#2D3436]",
      bg: "bg-gray-50",
    },
  ]

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid w-full grid-cols-2 gap-3"
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={item}
          className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
        >
          <div className={`rounded-lg p-1.5 ${card.bg}`}>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-[11px] font-medium tracking-wide text-gray-400">
                {card.label}
              </p>
              {card.tooltip && (
                <div className="relative flex items-center">
                  <button
                    onClick={() =>
                      setActiveTooltip(
                        activeTooltip === card.label ? null : card.label
                      )
                    }
                    className="flex items-center justify-center"
                  >
                    <HelpCircle className="h-3 w-3 cursor-help text-gray-400" />
                  </button>
                  {activeTooltip === card.label && (
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-[10px] whitespace-nowrap text-white">
                      {card.tooltip}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-lg leading-tight font-bold text-[#2D3436]">
              {card.value}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
