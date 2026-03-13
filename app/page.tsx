"use client"

import { useState, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Map, BarChart3, Waypoints, CloudSun } from "lucide-react"

import type {
  ParsedRoute,
  TrackPoint,
  Segment,
  WaypointSegment,
} from "@/lib/types"
import { parseGPX } from "@/lib/gpx-parser"
import { supabase } from "@/lib/supabase"

import { Header } from "@/components/trail/Header"
import { UploadCard } from "@/components/trail/UploadCard"
import { HeaderInfo } from "@/components/trail/HeaderInfo"
import { MetricsPanel } from "@/components/trail/MetricsPanel"
import { ElevationChart } from "@/components/trail/ElevationChart"
import { SegmentList } from "@/components/trail/SegmentList"
import { WeatherForecast } from "@/components/trail/WeatherForecast"
import { GradientDistribution } from "@/components/trail/GradientDistribution"
import { Footer } from "@/components/trail/Footer"
import {
  ModalFormInfo,
  type RouteDetailsData,
} from "@/components/trail/ModalFormInfo"
import { SessionNameModal } from "@/components/trail/SessionNameModal"

// Dynamic import for MapView (no SSR — Leaflet + MapLibre need window)
const MapView = dynamic(
  () => import("@/components/trail/MapView").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-87.5 items-center justify-center rounded-xl bg-gray-100 lg:h-112.5">
        <div className="text-sm text-gray-400">Loading map...</div>
      </div>
    ),
  }
)

// ─── Feature cards for empty state ─────────────────────────────────
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

export default function Home() {
  const [route, setRoute] = useState<ParsedRoute | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null)
  const [highlightRange, setHighlightRange] = useState<{
    startIndex: number
    endIndex: number
  } | null>(null)

  // Session Runner Name
  const [sessionRunnerName, setSessionRunnerName] = useState<string>("")
  const [showSessionModal, setShowSessionModal] = useState(false)

  // Load session name on mount
  useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("runnerName")
      if (saved) {
        setSessionRunnerName(saved)
      } else {
        setShowSessionModal(true)
      }
    }
  })

  const handleSessionNameSubmit = (name: string) => {
    setSessionRunnerName(name)
    sessionStorage.setItem("runnerName", name)
    setShowSessionModal(false)
  }

  // Route Details Form State
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [routeDetails, setRouteDetails] = useState<RouteDetailsData>({
    raceName: "",
    raceDate: new Date().toISOString().split("T")[0],
  })
  const [tempRoute, setTempRoute] = useState<ParsedRoute | null>(null)
  const [tempFileName, setTempFileName] = useState<string>("")
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false)

  const finishUpload = useCallback(
    async (
      parsed: ParsedRoute,
      name: string,
      details: RouteDetailsData,
      runnerName: string
    ) => {
      setIsSubmittingDetails(true)

      try {
        // Save to Supabase telemetry table
        const { error: dbError } = await supabase.from("user_routes").insert([
          {
            user_name: runnerName,
            race_name: details.raceName,
            race_date: details.raceDate,
            file_name: name,
            distance: parseFloat((parsed.stats.totalDistance / 1000).toFixed(2)),
            elevation_gain: parsed.stats.elevationGain,
          },
        ])

        if (dbError) {
          console.error("Failed to save route telemetry:", dbError)
        }
      } catch (err) {
        console.error("Error saving to supabase:", err)
      } finally {
        setRoute(parsed)
        setFileName(name)
        setShowDetailsModal(false)
        setTempRoute(null)
        setTempFileName("")
        setIsSubmittingDetails(false)
      }
    },
    []
  )

  const handleFileLoaded = useCallback(
    (content: string, name: string) => {
      try {
        setError("")
        const parsed = parseGPX(content)
        const today = new Date().toISOString().split("T")[0]

        // If example file, skip modal and auto-fill
        if (name === "Rinjani-162K-2025.gpx") {
          const exampleDetails = {
            raceName: "Rinjani 162K",
            raceDate: today,
          }
          setRouteDetails(exampleDetails)
          finishUpload(parsed, name, exampleDetails, sessionRunnerName)
          return
        }

        // For manual upload, reset fields (except date) and show modal
        setTempRoute(parsed)
        setTempFileName(name)
        setRouteDetails({
          raceName: "",
          raceDate: today,
        })

        setShowDetailsModal(true)
        setHighlightRange(null)
        setHoveredPoint(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse GPX file")
        setTempRoute(null)
        setTempFileName("")
      }
    },
    [finishUpload, sessionRunnerName]
  )

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (tempRoute && tempFileName) {
      await finishUpload(tempRoute, tempFileName, routeDetails, sessionRunnerName)
    }
  }

  const handleSegmentClick = useCallback((segment: Segment) => {
    setHighlightRange((prev) =>
      prev?.startIndex === segment.startIndex &&
        prev?.endIndex === segment.endIndex
        ? null
        : { startIndex: segment.startIndex, endIndex: segment.endIndex }
    )
  }, [])

  const handleWaypointSegmentClick = useCallback((segment: WaypointSegment) => {
    setHighlightRange((prev) =>
      prev?.startIndex === segment.startIndex &&
        prev?.endIndex === segment.endIndex
        ? null
        : { startIndex: segment.startIndex, endIndex: segment.endIndex }
    )
  }, [])

  // Memoize to avoid unnecessary re-renders
  const mapProps = useMemo(() => {
    if (!route) return null
    return {
      points: route.points,
      waypoints: route.waypoints,
      bounds: route.bounds,
    }
  }, [route])

  return (
    <div className="min-h-screen bg-[#FAF6F1]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* ── Empty state ───────────────────────── */}
        <AnimatePresence mode="wait">
          {!route ? (
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

              <UploadCard
                onFileLoaded={handleFileLoaded}
                fileName={fileName}
                error={error}
              />

              {/* Tagline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 text-center"
              >
                <p className="text-lg font-semibold text-gray-500">
                  Analyze your trail race.
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
                className="mt-8 grid grid-cols-2 gap-3"
              >
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <div className={`mb-2 inline-flex rounded-lg p-2 ${f.bg}`}>
                      <f.icon className={`h-5 w-5 ${f.color}`} />
                    </div>
                    <p className="text-sm font-semibold text-[#2D3436]">
                      {f.title}
                    </p>
                    <p className="text-xs text-gray-400">{f.desc}</p>
                  </div>
                ))}
              </motion.div>

              <Footer />
            </motion.div>
          ) : (
            /* ── Loaded state ──────────────────────── */
            <motion.div
              key="loaded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-6 lg:grid-cols-[1fr_420px]"
            >
              {/* Left column (main content) */}
              <div className="order-2 flex flex-col gap-5 lg:order-1">
                {/* Route Header Info */}
                <div className="block lg:hidden">
                  <HeaderInfo
                    raceName={routeDetails.raceName}
                    userName={sessionRunnerName}
                    raceDate={routeDetails.raceDate}
                  />
                </div>

                {/* Metrics */}
                <div className="block lg:hidden">
                  <MetricsPanel stats={route.stats} />
                </div>

                {/* Map */}
                {mapProps && (
                  <MapView
                    {...mapProps}
                    hoveredPoint={hoveredPoint}
                    highlightRange={highlightRange}
                  />
                )}

                {/* Elevation chart */}
                <ElevationChart
                  points={route.points}
                  waypoints={route.waypoints}
                  onHover={setHoveredPoint}
                />

                {/* Segments */}
                <SegmentList
                  key={fileName}
                  segments={route.segments}
                  waypointSegments={route.waypointSegments}
                  onSegmentClick={handleSegmentClick}
                  onWaypointSegmentClick={handleWaypointSegmentClick}
                  onTabChange={() => setHighlightRange(null)}
                />

                {/* Gradient Distribution */}
                <GradientDistribution points={route.points} />

                {/* Weather */}
                <WeatherForecast
                  center={route.center}
                  initialDate={routeDetails.raceDate}
                />

                <Footer />
              </div>

              {/* Right column (sidebar — sticky on desktop) */}
              <div className="order-1 lg:order-2 lg:block">
                <div className="flex flex-col gap-5 lg:sticky lg:top-15">
                  {/* Upload card */}
                  <UploadCard
                    onFileLoaded={handleFileLoaded}
                    fileName={fileName}
                    error={error}
                  />

                  {/* Route Header Info */}
                  <div className="hidden lg:block">
                    <HeaderInfo
                      raceName={routeDetails.raceName}
                      userName={sessionRunnerName}
                      raceDate={routeDetails.raceDate}
                    />
                  </div>

                  {/* Metrics */}
                  <div className="hidden lg:block">
                    <MetricsPanel stats={route.stats} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Route Details Modal ────────────────────── */}
        <ModalFormInfo
          isOpen={showDetailsModal}
          routeDetails={routeDetails}
          onChange={setRouteDetails}
          onSubmit={handleDetailsSubmit}
          isSubmitting={isSubmittingDetails}
          onCancel={() => {
            setShowDetailsModal(false)
            setTempRoute(null)
            setTempFileName("")
          }}
        />

        <SessionNameModal
          isOpen={showSessionModal}
          onSubmit={handleSessionNameSubmit}
        />
      </main>
    </div>
  )
}
