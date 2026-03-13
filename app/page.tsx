"use client"

import { useState, useCallback, useMemo, useEffect, Suspense } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Map, BarChart3, Waypoints, CloudSun } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useProfile } from "@/hooks/useProfile"

import type {
  ParsedRoute,
  TrackPoint,
  Segment,
  WaypointSegment,
} from "@/lib/types"
import { parseGPX } from "@/lib/gpx-parser"
import { supabase } from "@/lib/supabase"
import { storage, type SavedRoute } from "@/lib/storage"

import { Header } from "@/components/trail/Header"
import { AuthModal } from "@/components/trail/AuthModal"
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
import { SavedRoutesModal } from "@/components/trail/SavedRoutesModal"

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
    title: "Segment Analysis",
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

export default function HomeWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAF6F1]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1B4332]/20 border-t-[#1B4332]" />
        </div>
      }
    >
      <Home />
    </Suspense>
  )
}

function Home() {
  const [route, setRoute] = useState<ParsedRoute | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null)
  const [highlightRange, setHighlightRange] = useState<{
    startIndex: number
    endIndex: number
  } | null>(null)

  // Route Details Form State
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [routeDetails, setRouteDetails] = useState<RouteDetailsData>({
    userName: "",
    routeName: "",
    raceDate: new Date().toISOString().split("T")[0],
  })
  const [tempRoute, setTempRoute] = useState<ParsedRoute | null>(null)
  const [tempFileName, setTempFileName] = useState<string>("")
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false)

  // Saved Routes State
  const [isSavedRoutesModalOpen, setIsSavedRoutesModalOpen] = useState(false)
  const [isCurrentRouteSaved, setIsCurrentRouteSaved] = useState(false)

  // Auth State
  const { profile, user, fetched } = useProfile()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const searchParams = useSearchParams()

  // Auto-open modal if there's an auth error in the URL
  useEffect(() => {
    if (searchParams?.get("error") === "user_not_found") {
      setIsAuthModalOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (user && profile) {
      setRouteDetails((prev) => ({
        ...prev,
        userName: profile.full_name || profile.username || "",
      }))
    }
  }, [user, profile])

  useEffect(() => {
    // Listen for auth sign out to clear state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setRouteDetails((prev) => ({ ...prev, userName: "" }))
        setRoute(null)
        setFileName("")
        setError("")
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync "isSaved" state with storage
  useEffect(() => {
    const checkSaved = async () => {
      if (!route || !routeDetails.routeName) {
        setIsCurrentRouteSaved(false)
        return
      }

      const routes = await storage.getRoutes()
      const isSaved = routes.some(
        (r) => r.fileName === fileName && r.name === routeDetails.routeName
      )
      setIsCurrentRouteSaved(isSaved)
    }

    checkSaved()
  }, [route, routeDetails.routeName, fileName])

  const finalizeRoute = useCallback(
    async (
      routeData: ParsedRoute,
      fName: string,
      details: { userName: string; routeName: string; raceDate: string }
    ) => {
      setIsSubmittingDetails(true)

      try {
        // Save to Supabase telemetry table
        const { error: dbError } = await supabase.from("user_routes").insert([
          {
            user_name: details.userName,
            route_name: details.routeName,
            race_date: details.raceDate,
            file_name: fName,
            distance: parseFloat(
              (routeData.stats.totalDistance / 1000).toFixed(2)
            ),
            elevation_gain: routeData.stats.elevationGain,
          },
        ])

        if (dbError) {
          console.error("Failed to save route telemetry:", dbError)
        }
      } catch (err) {
        console.error("Error saving to supabase:", err)
      } finally {
        setRouteDetails(details)
        setRoute(routeData)
        setFileName(fName)
        setShowDetailsModal(false)
        setTempRoute(null)
        setIsSubmittingDetails(false)
        setIsCurrentRouteSaved(false)
      }
    },
    []
  )

  const handleSaveRoute = useCallback(async () => {
    if (!route || !routeDetails.routeName) return

    const result = await storage.saveRoute(
      routeDetails.routeName,
      routeDetails.userName || "Runner",
      routeDetails.raceDate,
      fileName,
      route
    )

    if (result.success) {
      setIsCurrentRouteSaved(true)
    } else {
      setError(result.error || "Failed to save route")
    }
  }, [route, routeDetails, fileName])

  const handleLoadSavedRoute = useCallback((saved: SavedRoute) => {
    setRoute(saved.routeData)
    setFileName(saved.fileName)
    setRouteDetails({
      userName: saved.userName,
      routeName: saved.name,
      raceDate: saved.date,
    })
    setIsCurrentRouteSaved(true)
    setError("")
  }, [])

  const handleFileLoaded = useCallback(
    (content: string, name: string) => {
      try {
        setError("")
        const parsed = parseGPX(content)

        // If example file, skip modal and fill automatically
        if (name === "Rinjani-162K-2025.gpx") {
          finalizeRoute(parsed, name, {
            ...routeDetails,
            routeName: "Rinjani 162K",
          })
          return
        }

        // For other files, show modal
        setTempRoute(parsed)
        setTempFileName(name)
        setRouteDetails((prev) => ({
          ...prev,
          routeName: "",
        }))

        setShowDetailsModal(true)
        setHighlightRange(null)
        setHoveredPoint(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to parse GPX file"
        )
        setTempRoute(null)
        setTempFileName("")
      }
    },
    [finalizeRoute, routeDetails]
  )

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (tempRoute) {
      await finalizeRoute(tempRoute, tempFileName, routeDetails)
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
      <Header
        isAuthModalOpen={isAuthModalOpen}
        onAuthModalOpenChange={setIsAuthModalOpen}
        onOpenSavedRoutes={() => setIsSavedRoutesModalOpen(true)}
      />

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
              {profile && (
                <motion.h2
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 text-center text-2xl font-bold text-[#1B4332]"
                >
                  Hi {profile.full_name?.split(" ")[0] || "Runner"}!
                </motion.h2>
              )}
              <UploadCard
                onFileLoaded={handleFileLoaded}
                fileName={fileName}
                error={error}
                isRegistered={!!profile}
                onAuthRequired={() => setIsAuthModalOpen(true)}
              />

              {/* Tagline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 text-center"
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
                    routeName={routeDetails.routeName}
                    userName={routeDetails.userName}
                    raceDate={routeDetails.raceDate}
                    onSave={
                      fileName === "Rinjani-162K-2025.gpx"
                        ? undefined
                        : handleSaveRoute
                    }
                    isSaved={isCurrentRouteSaved}
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
                  <div className="flex flex-col gap-2">
                    <UploadCard
                      onFileLoaded={handleFileLoaded}
                      fileName={fileName}
                      error={error}
                      isRegistered={!!profile}
                      onAuthRequired={() => setIsAuthModalOpen(true)}
                    />
                  </div>

                  {/* Route Header Info */}
                  <div className="hidden lg:block">
                    <HeaderInfo
                      routeName={routeDetails.routeName}
                      userName={routeDetails.userName}
                      raceDate={routeDetails.raceDate}
                      onSave={
                        fileName === "Rinjani-162K-2025.gpx"
                          ? undefined
                          : handleSaveRoute
                      }
                      isSaved={isCurrentRouteSaved}
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

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />

        <SavedRoutesModal
          isOpen={isSavedRoutesModalOpen}
          onClose={() => setIsSavedRoutesModalOpen(false)}
          onLoadRoute={handleLoadSavedRoute}
        />
      </main>
    </div>
  )
}
