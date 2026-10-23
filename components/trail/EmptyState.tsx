"use client"

import { motion } from "framer-motion"
import { Map, BarChart3, Waypoints, CloudSun } from "lucide-react"
import { UploadCard } from "./UploadCard"
import { Footer } from "./Footer"

const FEATURES = [
  {
    icon: Map,
    title: "Route Map",
    desc: "Interactive 3D map",
    color: "text-[#2A9D8F]",
    bg: "bg-[#2A9D8F]/5",
  },
  {
    icon: BarChart3,
    title: "Elevation Profile",
    desc: "Detailed elevation chart",
    color: "text-[#F4A261]",
    bg: "bg-[#F4A261]/5",
  },
  {
    icon: Waypoints,
    title: "Segment Breakdown",
    desc: "Auto-detected segments",
    color: "text-[#E9C46A]",
    bg: "bg-[#E9C46A]/5",
  },
  {
    icon: CloudSun,
    title: "Weather Forecast",
    desc: "Forecast along the route",
    color: "text-[#457B9D]",
    bg: "bg-[#457B9D]/5",
  },
]

interface EmptyStateProps {
  sessionRunnerName: string
  onFileLoaded: (content: string, name: string) => Promise<void>
  onError: (error: string) => void
  fileName: string
  error: string
  isLoading: boolean
}

export function EmptyState({
  sessionRunnerName,
  onFileLoaded,
  onError,
  fileName,
  error,
  isLoading,
}: EmptyStateProps) {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="mx-auto max-w-lg"
    >
      {sessionRunnerName && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <h2 className="text-2xl font-bold text-[#1B4332]">
            Hello, {sessionRunnerName}!
          </h2>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <UploadCard
          onFileLoaded={onFileLoaded}
          onError={onError}
          fileName={fileName}
          error={error}
          isLoading={isLoading}
        />
      </motion.div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-center"
      >
        <p className="text-lg font-semibold text-gray-500">
          Analyze your trail route.
        </p>
        <p className="text-lg font-semibold text-gray-500">
          Plan your strategy.
        </p>
      </motion.div>

      {/* Feature cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="my-6 grid grid-cols-2 gap-3"
      >
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className={`mb-2 inline-flex rounded-lg p-2 ${f.bg}`}>
              <f.icon className={`h-5 w-5 ${f.color}`} />
            </div>
            <p className="text-sm font-semibold text-[#2D3436]">{f.title}</p>
            <p className="text-xs text-gray-400">{f.desc}</p>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Footer runnerName={sessionRunnerName} />
      </motion.div>
    </motion.div>
  )
}
