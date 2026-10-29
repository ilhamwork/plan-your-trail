"use client"

import { memo, useState, useEffect } from "react"
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
import { formatKm } from "@/lib/format"
import { useI18n } from "@/lib/i18n/context"

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

export const MetricsPanel = memo(function MetricsPanel({ stats }: MetricsPanelProps) {
  const { t } = useI18n()
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  useEffect(() => {
    if (!activeTooltip) return

    const handleGlobalClick = () => {
      setActiveTooltip(null)
    }

    window.addEventListener("mousedown", handleGlobalClick)
    return () => window.removeEventListener("mousedown", handleGlobalClick)
  }, [activeTooltip])

  const cards = [
    {
      id: "distance",
      icon: Mountain,
      label: t("metrics.distance"),
      value: `${formatKm(stats.totalDistance)} km`,
      color: "text-[#2A9D8F]",
      bg: "bg-[#2A9D8F]/5",
    },
    {
      id: "effort",
      icon: Zap,
      label: "Total Effort",
      value: `${(stats.totalDistance / 1000 + stats.elevationGain * 0.01).toFixed(1)} km`,
      color: "text-[#E9C46A]",
      bg: "bg-[#E9C46A]/5",
      tooltip: "Distance (km) + (Elevation Gain (m) / 100)",
    },
    {
      id: "elevGain",
      icon: TrendingUp,
      label: t("metrics.elevGain"),
      value: `${stats.elevationGain} m`,
      color: "text-[#F4A261]",
      bg: "bg-[#F4A261]/5",
      tooltip: "Total sum of all uphill sections",
    },
    {
      id: "elevLoss",
      icon: TrendingDown,
      label: t("metrics.elevLoss"),
      value: `${stats.elevationLoss} m`,
      color: "text-[#264653]",
      bg: "bg-[#264653]/5",
      tooltip: "Total sum of all downhill sections",
    },
    {
      id: "highest",
      icon: ArrowUpRight,
      label: t("metrics.maxElev"),
      value: `${stats.highestPoint} m`,
      color: "text-[#E76F51]",
      bg: "bg-[#E76F51]/5",
    },
    {
      id: "lowest",
      icon: ArrowDownLeft,
      label: t("metrics.minElev"),
      value: `${stats.lowestPoint} m`,
      color: "text-[#457B9D]",
      bg: "bg-[#457B9D]/5",
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
          key={card.id}
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
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTooltip(
                        activeTooltip === card.id ? null : card.id
                      )
                    }}
                    className="flex items-center justify-center"
                  >
                    <HelpCircle className="h-3 w-3 cursor-help text-gray-400" />
                  </button>
                  {activeTooltip === card.id && (
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
})
