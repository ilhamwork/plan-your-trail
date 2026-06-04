import type { TrackPoint, Waypoint } from "./types"

/**
 * Generates a GPX XML string from track points and waypoints.
 * Includes all <trkpt> entries with elevation, plus <wpt> entries for each waypoint.
 */
export function generateGPX(
  trackPoints: TrackPoint[],
  waypoints: Waypoint[],
  routeName: string = "Route"
): string {
  const escape = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")

  // Sort waypoints by distance
  const sorted = [...waypoints].sort((a, b) => a.distance - b.distance)

  const wptElements = sorted
    .map(
      (wp) =>
        `  <wpt lat="${wp.lat.toFixed(7)}" lon="${wp.lon.toFixed(7)}">
    <ele>${wp.ele.toFixed(1)}</ele>
    <name>${escape(wp.name)}</name>
  </wpt>`
    )
    .join("\n")

  const trkptElements = trackPoints
    .map(
      (pt) =>
        `        <trkpt lat="${pt.lat.toFixed(7)}" lon="${pt.lon.toFixed(7)}">
          <ele>${pt.ele.toFixed(1)}</ele>
        </trkpt>`
    )
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Plan Your Trail" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escape(routeName)}</name>
  </metadata>
${wptElements ? wptElements + "\n" : ""}  <trk>
    <name>${escape(routeName)}</name>
    <trkseg>
${trkptElements}
    </trkseg>
  </trk>
</gpx>`
}

/**
 * Triggers a browser download of the generated GPX file.
 */
export function downloadGPX(
  trackPoints: TrackPoint[],
  waypoints: Waypoint[],
  routeName: string = "Route"
): void {
  const gpxString = generateGPX(trackPoints, waypoints, routeName)
  const blob = new Blob([gpxString], { type: "application/gpx+xml" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${routeName}.gpx`
  link.click()
  URL.revokeObjectURL(url)
}
