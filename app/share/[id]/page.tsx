"use client"

import { useState, useEffect, useMemo, use } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { Map, BarChart3, Waypoints, CloudSun, AlertCircle } from "lucide-react"

import type {
  ParsedRoute,
  TrackPoint,
  Segment,
  WaypointSegment,
} from "@/lib/types"
import { supabase } from "@/lib/supabase"

import { Header } from "@/components/trail/Header"
import { HeaderInfo } from "@/components/trail/HeaderInfo"
import { MetricsPanel } from "@/components/trail/MetricsPanel"
import { ElevationChart } from "@/components/trail/ElevationChart"
import { SegmentList } from "@/components/trail/SegmentList"
import { WeatherForecast } from "@/components/trail/WeatherForecast"
import { GradientDistribution } from "@/components/trail/GradientDistribution"
import { DonationSection } from "@/components/trail/DonationSection"
import { Footer } from "@/components/trail/Footer"

// Dynamic import for MapView
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

export default function SharedRoutePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [route, setRoute] = useState<ParsedRoute | null>(null)
  const [routeInfo, setRouteInfo] = useState<{
    raceName: string
    userName: string
    raceDate: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null)
  const [highlightRange, setHighlightRange] = useState<{
    startIndex: number
    endIndex: number
  } | null>(null)

  useEffect(() => {
    async function fetchRoute() {
      try {
        const { data, error: dbError } = await supabase
          .from("shared_routes")
          .select("*")
          .eq("id", id)
          .single()

        if (dbError) throw dbError
        if (!data) throw new Error("Route not found")

        setRoute(data.route_data as ParsedRoute)
        setRouteInfo({
          raceName: data.race_name,
          userName: data.user_name,
          raceDate: data.race_date,
        })
      } catch (err) {
        console.error("Error fetching shared route:", err)
        setError(
          err instanceof Error ? err.message : "Failed to load shared route"
        )
      } finally {
        setLoading(false)
      }
    }

    fetchRoute()
  }, [id])

  const handleSegmentClick = (segment: Segment) => {
    setHighlightRange((prev) =>
      prev?.startIndex === segment.startIndex &&
      prev?.endIndex === segment.endIndex
        ? null
        : { startIndex: segment.startIndex, endIndex: segment.endIndex }
    )
  }

  const handleWaypointSegmentClick = (segment: WaypointSegment) => {
    setHighlightRange((prev) =>
      prev?.startIndex === segment.startIndex &&
      prev?.endIndex === segment.endIndex
        ? null
        : { startIndex: segment.startIndex, endIndex: segment.endIndex }
    )
  }

  const mapProps = useMemo(() => {
    if (!route) return null
    return {
      points: route.points,
      waypoints: route.waypoints,
      bounds: route.bounds,
    }
  }, [route])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6F1]">
        <Header />
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2A9D8F]/20 border-t-[#2A9D8F]" />
          <p className="font-medium text-gray-500">Loading shared route...</p>
        </div>
      </div>
    )
  }

  if (error || !route || !routeInfo) {
    return (
      <div className="min-h-screen bg-[#FAF6F1]">
        <Header />
        <div className="mx-auto max-w-md px-4 py-20">
          <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Oops!</h2>
            <p className="text-gray-500">{error || "Something went wrong"}</p>
            <a
              href="/"
              className="mt-6 inline-block rounded-xl bg-[#1B4332] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#2D5A46]"
            >
              Analyze Your Own Route
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF6F1]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 lg:grid-cols-[1fr_420px]"
        >
          {/* Left column (main content) */}
          <div className="order-2 flex flex-col gap-5 lg:order-1">
            {/* Route Header Info Mobile */}
            <div className="block lg:hidden">
              <HeaderInfo
                raceName={routeInfo.raceName}
                userName={routeInfo.userName}
                raceDate={routeInfo.raceDate}
              />
            </div>

            {/* Metrics Mobile */}
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
              initialDate={routeInfo.raceDate}
            />

            <DonationSection />

            <Footer />
          </div>

          {/* Right column (sidebar — sticky on desktop) */}
          <div className="order-1 lg:order-2">
            <div className="flex flex-col gap-5 lg:sticky lg:top-15">
              {/* Promotion / Call to Action */}
              <div className="rounded-2xl bg-linear-to-br from-[#1B4332] to-[#2D5A46] p-6 text-white shadow-xl">
                <h3 className="mb-2 text-lg font-bold">
                  Shared Trail Analysis
                </h3>
                <p className="mb-4 text-xs leading-relaxed text-white/70">
                  This route was analyzed using <strong>Plan Your Trail</strong>
                  . Analyze your own GPX files for free and plan your next
                  adventure.
                </p>
                <a
                  href="/"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-[#1B4332] transition-all hover:bg-[#FAF6F1]"
                >
                  Plan Your Trail
                </a>
              </div>

              {/* Route Header Info Desktop */}
              <div className="hidden lg:block">
                <HeaderInfo
                  raceName={routeInfo.raceName}
                  userName={routeInfo.userName}
                  raceDate={routeInfo.raceDate}
                />
              </div>

              {/* Metrics Desktop */}
              <div className="hidden lg:block">
                <MetricsPanel stats={route.stats} />
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
