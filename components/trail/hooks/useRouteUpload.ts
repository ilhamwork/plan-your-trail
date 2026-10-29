"use client"

import { useState, useCallback } from "react"
import type { GPXData, Waypoint } from "@/lib/types"
import type { RouteDetailsData } from "@/components/trail/ModalFormInfo"
import { supabase } from "@/lib/supabase"
import { formatKm } from "@/lib/format"
import { trackEvent } from "@/lib/analytics/events"
import { useEntitlements } from "@/lib/entitlements"
import { useI18n } from "@/lib/i18n/context"

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
  const { user, limits: tierLimits } = useEntitlements()
  const { t } = useI18n()
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
      // Update UI state immediately so route rendering is never blocked by network/telemetry
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

      // Fire-and-forget telemetry with short timeout so unreachable/slow Supabase never hangs upload
      void Promise.race([
        supabase.from("user_routes").insert([
          {
            user_name: runnerName,
            race_name: details.raceName,
            race_date: details.raceDate,
            file_name: name,
            distance: parseFloat(formatKm(parsed.stats.totalDistance, 2)),
            elevation_gain: parsed.stats.elevationGain,
          },
        ]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Telemetry timeout")), 3000)
        ),
      ]).catch(() => {
        // Ignore telemetry errors silently
      })
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

        if (source !== "example" && content.length > tierLimits.maxUploadBytes) {
          let msg: string
          if (!user) {
            msg = t("home.upload.limitAnon")
          } else if (user.plan === "pro") {
            msg = t("home.upload.limitPro")
          } else {
            msg = t("home.upload.limitFree")
          }
          setError(msg)
          return
        }

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
          await finishUpload(parsed, name, exampleDetails, sessionRunnerName)
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
          err instanceof Error ? err.message : t("home.upload.parseError")
        )
        setTempRoute(null)
        setTempFileName("")
      } finally {
        setIsParsingGPX(false)
      }
    },
    [
      parseGPX,
      finishUpload,
      sessionRunnerName,
      onResetInteractions,
      tierLimits.maxUploadBytes,
      user,
      t,
    ]
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
