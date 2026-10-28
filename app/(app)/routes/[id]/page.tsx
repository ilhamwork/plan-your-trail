import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { getRoute } from "@/lib/db/queries/routes"
import { Header } from "@/components/trail/Header"
import { RouteDetailView } from "@/components/routes/RouteDetailView"
import { analyzeSegments, buildWaypointSegments } from "@/lib/segment-analysis"
import type { GPXData, RouteStats, TrackPoint, Waypoint } from "@/lib/types"

interface RouteDetailPageProps {
  params: Promise<{ id: string }> | { id: string }
}

export async function generateMetadata() {
  return {
    title: "Detail Rute | PlanYourTrail.run",
  }
}

export default async function RouteDetailPage({ params }: RouteDetailPageProps) {
  const user = await requireUser()
  const resolvedParams = await Promise.resolve(params)
  const routeId = resolvedParams.id

  if (!routeId) {
    notFound()
  }

  const savedRoute = await getRoute(user.id, routeId)
  if (!savedRoute) {
    notFound()
  }

  const metrics = savedRoute.metrics as {
    stats: RouteStats
    bounds: [[number, number], [number, number]]
    center: [number, number]
    raceDate?: string
    runnerName?: string
    waypoints?: Waypoint[]
  }

  const trackPoints = (savedRoute.trackSimplified as TrackPoint[]) || []
  const waypoints = (metrics.waypoints || []) as Waypoint[]
  const segments = analyzeSegments(trackPoints)
  const waypointSegments = buildWaypointSegments(trackPoints, waypoints)

  const gpxData: GPXData = {
    trackPoints,
    stats: metrics.stats,
    segments,
    waypointSegments,
    waypoints,
    bounds: metrics.bounds,
    center: metrics.center,
  }

  return (
    <div className="min-h-screen bg-[#FAF6F1]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <RouteDetailView
          routeId={savedRoute.id}
          routeName={savedRoute.name}
          gpxData={gpxData}
          raceDate={metrics.raceDate}
          runnerName={metrics.runnerName}
          createdAt={savedRoute.createdAt ? new Date(savedRoute.createdAt).toISOString() : undefined}
        />
      </main>
    </div>
  )
}
