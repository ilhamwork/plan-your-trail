"use client"

import { useState, useCallback } from "react"
import type { GPXData, Waypoint } from "@/lib/types"
import type { RouteDetailsData } from "@/components/trail/ModalFormInfo"
import { supabase } from "@/lib/supabase"
import { formatKm } from "@/lib/format"
import { trackEvent } from "@/lib/analytics/events"

const EXAMPLE_FILE_NAME = "Rinjani-162K-2025.gpx"

interface UseRouteUploadOptions {
  parseGPX: (content: string) => Promise<GPXData>
  sessionRunnerName: string
  onWaypointsLoaded: (waypoints: Waypoint[]) => void
  onResetInteractions?: () => void
}

export function useRouteUpload({
  parseGPX,
  sessionRunnerName,
  onWaypointsLoaded,
  onResetInteractions,
}: UseRouteUploadOptions) {
  const [gpxData, setGpxData] = useState<GPXData | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [rawGpxContent, setRawGpxContent] = useState<string>("")
  const [error, setError] = useState<string>("")

  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [routeDetails, setRouteDetails] = useState<RouteDetailsData>({
    raceName: "",
    raceDate: new Date().toISOString().split("T")[0],
  })
  const [tempRoute, setTempRoute] = useState<GPXData | null>(null)
  const [tempFileName, setTempFileName] = useState<string>("")
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false)
  const [isParsingGPX, setIsParsingGPX] = useState(false)

  const finishUpload = useCallback(
    async (
      parsed: GPXData,
      name: string,
      details: RouteDetailsData,
      runnerName: string
    ) => {
      setIsSubmittingDetails(true)

      try {
        const { error: dbError } = await supabase.from("user_routes").insert([
          {
            user_name: runnerName,
            race_name: details.raceName,
            race_date: details.raceDate,
            file_name: name,
            distance: parseFloat(formatKm(parsed.stats.totalDistance, 2)),
            elevation_gain: parsed.stats.elevationGain,
          },
        ])

        if (dbError) {
          console.error("Failed to save route telemetry:", dbError)
        }
      } catch (err) {
        console.error("Error saving to supabase:", err)
      } finally {
        setGpxData(parsed)
        setFileName(name)
        const initialWps = parsed.waypoints.map((wp) => ({
          ...wp,
          id: wp.id || crypto.randomUUID(),
          isFromGpx: true,
        }))
        onWaypointsLoaded(initialWps)
        setShowDetailsModal(false)
        setTempRoute(null)
        setTempFileName("")
        setIsSubmittingDetails(false)
      }
    },
    [onWaypointsLoaded]
  )

  const handleFileLoaded = useCallback(
    async (content: string, name: string) => {
      const source = name === EXAMPLE_FILE_NAME ? "example" : "upload"
      trackEvent("upload_started", {
        fileName: name,
        fileSizeBytes: content.length,
        source,
      })

      try {
        setError("")
        setRawGpxContent(content)
        setIsParsingGPX(true)
        const parsed = await parseGPX(content)

        trackEvent("analysis_completed", {
          source,
          distanceKm: Number((parsed.stats.totalDistance / 1000).toFixed(2)),
          elevationGainM: Math.round(parsed.stats.elevationGain),
          pointCount: parsed.trackPoints.length,
        })

        const today = new Date().toISOString().split("T")[0]

        // If example file, skip modal and auto-fill
        if (name === EXAMPLE_FILE_NAME) {
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
        onResetInteractions?.()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to parse GPX file"
        )
        setTempRoute(null)
        setTempFileName("")
      } finally {
        setIsParsingGPX(false)
      }
    },
    [parseGPX, finishUpload, sessionRunnerName, onResetInteractions]
  )

  const handleDetailsSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (tempRoute && tempFileName) {
        await finishUpload(
          tempRoute,
          tempFileName,
          routeDetails,
          sessionRunnerName
        )
      }
    },
    [tempRoute, tempFileName, finishUpload, routeDetails, sessionRunnerName]
  )

  const handleDetailsCancel = useCallback(() => {
    setShowDetailsModal(false)
    setTempRoute(null)
    setTempFileName("")
  }, [])

  return {
    gpxData,
    fileName,
    rawGpxContent,
    error,
    setError,
    routeDetails,
    setRouteDetails,
    showDetailsModal,
    tempRoute,
    tempFileName,
    isSubmittingDetails,
    isParsingGPX,
    handleFileLoaded,
    handleDetailsSubmit,
    handleDetailsCancel,
  }
}
