"use client"

import { useState, useCallback, useMemo } from "react"
import type { GPXData, Waypoint } from "@/lib/types"
import { interpolateCoordinatesForDistance } from "@/lib/gpx/interpolate"
import { buildWaypointSegments } from "@/lib/segment-analysis"
import { trackEvent } from "@/lib/analytics/events"

export function useWaypoints(gpxData: GPXData | null) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])

  const handleAddWaypoint = useCallback(
    (name: string, distanceKm: number) => {
      if (!gpxData) return
      const distMeters = distanceKm * 1000
      const coords = interpolateCoordinatesForDistance(
        gpxData.trackPoints,
        distMeters
      )
      const newWp: Waypoint = {
        id: crypto.randomUUID(),
        name,
        distance: distMeters,
        isFromGpx: false,
        ...coords,
      }
      setWaypoints((prev) => [...prev, newWp])
      trackEvent("waypoint_added", { source: "manual" })
    },
    [gpxData]
  )

  const handleEditWaypoint = useCallback(
    (id: string, name: string, distanceKm: number) => {
      if (!gpxData) return
      const distMeters = distanceKm * 1000
      setWaypoints((prev) =>
        prev.map((wp) => {
          if (wp.id === id) {
            const distChanged = Math.abs(wp.distance - distMeters) > 1
            const coords = distChanged
              ? interpolateCoordinatesForDistance(
                  gpxData.trackPoints,
                  distMeters
                )
              : { lat: wp.lat, lon: wp.lon, ele: wp.ele }
            return {
              ...wp,
              name,
              distance: distMeters,
              ...coords,
            }
          }
          return wp
        })
      )
      trackEvent("waypoint_edited", { source: "manual" })
    },
    [gpxData]
  )

  const handleRemoveWaypoint = useCallback((id: string) => {
    setWaypoints((prev) => prev.filter((wp) => wp.id !== id))
  }, [])

  // Sort waypoints by distance
  const sortedWaypoints = useMemo(() => {
    return [...waypoints].sort((a, b) => a.distance - b.distance)
  }, [waypoints])

  // Rebuild waypoint segments from merged waypoints
  const mergedWaypointSegments = useMemo(() => {
    if (!gpxData) return []
    return buildWaypointSegments(gpxData.trackPoints, sortedWaypoints)
  }, [gpxData, sortedWaypoints])

  return {
    waypoints,
    setWaypoints,
    handleAddWaypoint,
    handleEditWaypoint,
    handleRemoveWaypoint,
    sortedWaypoints,
    mergedWaypointSegments,
  }
}
