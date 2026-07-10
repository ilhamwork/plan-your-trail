import { NextResponse } from 'next/server'
import { DOMParser } from '@xmldom/xmldom'
import * as toGeoJSON from '@mapbox/togeojson'
import { resolveTier } from '@/lib/access-guard'
import { checkRateLimit, recordUpload } from '@/lib/rate-limiter'
import { analyzeSegments, buildWaypointSegments } from '@/lib/segment-analysis'
import type { TrackPoint, Waypoint, RouteStats, GPXData } from '@/lib/types'

// ---------------------------------------------------------------------------
// Constants (Req 13.1, 13.2)
// ---------------------------------------------------------------------------

const ANON_FREE_SIZE_LIMIT = 10_485_760  // 10 MB
const PRO_SIZE_LIMIT       = 26_214_400  // 25 MB

// ---------------------------------------------------------------------------
// Server-side GPX parsing (mirrors lib/gpx-parser.ts but uses @xmldom/xmldom
// instead of the browser-only DOMParser)
// ---------------------------------------------------------------------------

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function smoothElevation(elevations: number[], windowSize = 5): number[] {
  const half = Math.floor(windowSize / 2)
  return elevations.map((_, i, arr) => {
    const start = Math.max(0, i - half)
    const end = Math.min(arr.length - 1, i + half)
    let sum = 0
    for (let j = start; j <= end; j++) sum += arr[j]
    return sum / (end - start + 1)
  })
}

function parseGPXServer(gpxString: string): GPXData {
  const parser = new DOMParser()
  const doc = parser.parseFromString(gpxString, 'text/xml') as unknown as Document

  const parseError = (doc as unknown as { getElementsByTagName: (n: string) => { length: number } })
    .getElementsByTagName('parsererror')
  if (parseError && parseError.length > 0) {
    throw new Error('Invalid GPX file: Could not parse XML')
  }

  const geoJSON = toGeoJSON.gpx(doc)

  const rawPoints: { lat: number; lon: number; ele: number }[] = []

  for (const feature of geoJSON.features) {
    if (
      feature.geometry.type === 'LineString' ||
      feature.geometry.type === 'MultiLineString'
    ) {
      const coordArrays =
        feature.geometry.type === 'MultiLineString'
          ? (feature.geometry as GeoJSON.MultiLineString).coordinates
          : [(feature.geometry as GeoJSON.LineString).coordinates]

      for (const coords of coordArrays) {
        for (const coord of coords) {
          rawPoints.push({ lon: coord[0], lat: coord[1], ele: coord[2] ?? 0 })
        }
      }
    }
  }

  if (rawPoints.length < 2) {
    throw new Error('Invalid GPX file: Track must contain at least 2 points')
  }

  const smoothedEle = smoothElevation(rawPoints.map((p) => p.ele), 10)

  const trackPoints: TrackPoint[] = []
  let cumulativeDistance = 0

  for (let i = 0; i < rawPoints.length; i++) {
    if (i > 0) {
      cumulativeDistance += haversineDistance(
        rawPoints[i - 1].lat,
        rawPoints[i - 1].lon,
        rawPoints[i].lat,
        rawPoints[i].lon,
      )
    }

    const gradient =
      i > 0
        ? (() => {
            const dist = haversineDistance(
              rawPoints[i - 1].lat,
              rawPoints[i - 1].lon,
              rawPoints[i].lat,
              rawPoints[i].lon,
            )
            if (dist < 0.1) return 0
            return ((smoothedEle[i] - smoothedEle[i - 1]) / dist) * 100
          })()
        : 0

    trackPoints.push({
      lat: rawPoints[i].lat,
      lon: rawPoints[i].lon,
      ele: smoothedEle[i],
      distance: cumulativeDistance,
      gradient: Math.max(-50, Math.min(50, gradient)),
    })
  }

  // Calculate elevation stats
  const ELEVATION_NOISE_THRESHOLD = 5 // meters
  let elevationGain = 0
  let elevationLoss = 0
  let highestPoint = -Infinity
  let lowestPoint = Infinity
  let pendingEle = trackPoints[0]?.ele ?? 0

  for (let i = 0; i < trackPoints.length; i++) {
    if (trackPoints[i].ele > highestPoint) highestPoint = trackPoints[i].ele
    if (trackPoints[i].ele < lowestPoint) lowestPoint = trackPoints[i].ele
    if (i > 0) {
      const diff = trackPoints[i].ele - pendingEle
      if (Math.abs(diff) >= ELEVATION_NOISE_THRESHOLD) {
        if (diff > 0) elevationGain += diff
        else elevationLoss += Math.abs(diff)
        pendingEle = trackPoints[i].ele
      }
    }
  }

  // Extract waypoints from GPX <wpt> elements using @xmldom NodeList
  const xmlDoc = doc as unknown as { getElementsByTagName: (n: string) => ArrayLike<Element> }
  const wptElements = Array.from(xmlDoc.getElementsByTagName('wpt'))
  const rawWaypoints: { name: string; lat: number; lon: number; ele: number }[] = []

  for (const wpt of wptElements) {
    const lat = parseFloat(wpt.getAttribute('lat') ?? '0')
    const lon = parseFloat(wpt.getAttribute('lon') ?? '0')
    const eleEl = wpt.getElementsByTagName('ele')[0]
    const ele = parseFloat(eleEl?.textContent ?? '0')
    const nameEl = wpt.getElementsByTagName('name')[0]
    const name = nameEl?.textContent ?? 'Waypoint'
    rawWaypoints.push({ name, lat, lon, ele })
  }

  // Deduplicate raw waypoints
  const uniqueRawWaypoints: typeof rawWaypoints = []
  for (const rw of rawWaypoints) {
    const isDuplicate = uniqueRawWaypoints.some(
      (urw) =>
        urw.name === rw.name &&
        haversineDistance(urw.lat, urw.lon, rw.lat, rw.lon) < 50,
    )
    if (!isDuplicate) uniqueRawWaypoints.push(rw)
  }

  const waypoints: Waypoint[] = []
  const THRESHOLD_ENTER = 500
  const THRESHOLD_EXIT = 500
  const MIN_TRACK_DIST_BETWEEN_PASSES = 1_000

  for (const wpt of uniqueRawWaypoints) {
    let inPass = false
    let currentPassMinDist = Infinity
    let currentPassIdx = -1
    const passIndices: number[] = []

    for (let i = 0; i < trackPoints.length; i++) {
      const d = haversineDistance(wpt.lat, wpt.lon, trackPoints[i].lat, trackPoints[i].lon)

      if (!inPass && d < THRESHOLD_ENTER) {
        inPass = true
        currentPassMinDist = d
        currentPassIdx = i
      } else if (inPass) {
        if (d < currentPassMinDist) {
          currentPassMinDist = d
          currentPassIdx = i
        }
        if (d > THRESHOLD_EXIT) {
          passIndices.push(currentPassIdx)
          inPass = false
        }
      }
    }
    if (inPass) passIndices.push(currentPassIdx)
    if (passIndices.length === 0) continue

    const filteredPassIndices: number[] = []
    for (const idx of passIndices) {
      if (filteredPassIndices.length === 0) {
        filteredPassIndices.push(idx)
      } else {
        const lastIdx = filteredPassIndices[filteredPassIndices.length - 1]
        const distDiff = Math.abs(
          trackPoints[idx].distance - trackPoints[lastIdx].distance,
        )
        if (distDiff > MIN_TRACK_DIST_BETWEEN_PASSES) {
          filteredPassIndices.push(idx)
        } else {
          const d1 = haversineDistance(wpt.lat, wpt.lon, trackPoints[idx].lat, trackPoints[idx].lon)
          const d2 = haversineDistance(
            wpt.lat,
            wpt.lon,
            trackPoints[lastIdx].lat,
            trackPoints[lastIdx].lon,
          )
          if (d1 < d2) filteredPassIndices[filteredPassIndices.length - 1] = idx
        }
      }
    }

    for (const idx of filteredPassIndices) {
      waypoints.push({
        name: wpt.name,
        lat: wpt.lat,
        lon: wpt.lon,
        ele: wpt.ele,
        distance: trackPoints[idx].distance,
      })
    }
  }

  waypoints.sort((a, b) => a.distance - b.distance)

  let south = Infinity, west = Infinity, north = -Infinity, east = -Infinity
  for (const p of trackPoints) {
    if (p.lat < south) south = p.lat
    if (p.lat > north) north = p.lat
    if (p.lon < west) west = p.lon
    if (p.lon > east) east = p.lon
  }

  const stats: RouteStats = {
    totalDistance: cumulativeDistance,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    highestPoint: Math.round(highestPoint),
    lowestPoint: Math.round(lowestPoint),
    waypointCount: waypoints.length,
  }

  const segments = analyzeSegments(trackPoints, cumulativeDistance)
  const waypointSegments = buildWaypointSegments(trackPoints, waypoints)

  return {
    trackPoints,
    stats,
    segments,
    waypointSegments,
    waypoints,
    bounds: [[south, west], [north, east]],
    center: [(south + north) / 2, (west + east) / 2],
  }
}

// ---------------------------------------------------------------------------
// POST /api/upload
// Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8, 13.1, 13.2, 13.3
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // ─── 1. Resolve tier ──────────────────────────────────────────────
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // ─── 2. Determine rate-limit identifier ───────────────────────────
  const identifierType: 'ip' | 'user' = ctx.tier === 'anonymous' ? 'ip' : 'user'
  const identifier =
    ctx.tier === 'anonymous'
      ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown')
      : ctx.userId!

  // ─── 3. Check rate limit BEFORE processing (Req 6.6, 6.7) ────────
  const rateLimit = await checkRateLimit(identifier, identifierType, ctx.tier)

  if (!rateLimit.allowed) {
    // Blocked upload — do NOT record, just return 429 (Req 6.6, 6.7, 6.8)
    const cta =
      ctx.tier === 'anonymous'
        ? 'Create a free account to get 50 uploads per day'
        : 'Upgrade to Pro for unlimited uploads'

    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Upload limit reached. ${cta}`,
          cta,
          retryAfter: rateLimit.resetAt.toISOString(),
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            (rateLimit.resetAt.getTime() - Date.now()) / 1000,
          ).toString(),
        },
      },
    )
  }

  // ─── 4. Parse multipart form ──────────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_FORM', message: 'Expected multipart/form-data' } },
      { status: 400 },
    )
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: 'MISSING_FILE', message: 'A "file" field is required in the form data' } },
      { status: 400 },
    )
  }

  // ─── 5. Enforce file size limits (Req 13.1, 13.2, 13.3) ──────────
  const sizeLimit = ctx.tier === 'pro' ? PRO_SIZE_LIMIT : ANON_FREE_SIZE_LIMIT
  const tierLabel = ctx.tier === 'pro' ? 'Pro' : ctx.tier === 'free' ? 'Free' : 'Anonymous'

  if (file.size > sizeLimit) {
    const limitMB = ctx.tier === 'pro' ? 25 : 10
    return NextResponse.json(
      {
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File exceeds the ${limitMB} MB limit for the ${tierLabel} plan.`,
          limit: sizeLimit,
          limitMB,
          tier: ctx.tier,
          tierName: tierLabel,
        },
      },
      { status: 413 },
    )
  }

  // ─── 6. Read and parse GPX ────────────────────────────────────────
  let gpxText: string
  try {
    gpxText = await file.text()
  } catch {
    return NextResponse.json(
      { error: { code: 'FILE_READ_ERROR', message: 'Failed to read uploaded file' } },
      { status: 400 },
    )
  }

  let gpxData: GPXData
  try {
    gpxData = parseGPXServer(gpxText)
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_GPX',
          message: err instanceof Error ? err.message : 'Failed to parse GPX file',
        },
      },
      { status: 422 },
    )
  }

  // ─── 7. Record upload (only for allowed, processed requests) ──────
  // Req 6.6, 6.7: blocked uploads are never recorded — we only reach here
  // if checkRateLimit returned allowed: true.
  await recordUpload(identifier, identifierType)

  // ─── 8. Build response ────────────────────────────────────────────
  // Check count AFTER recording to determine nudge (count is now rateLimit.count + 1)
  const newCount = rateLimit.count + 1

  // Nudge prompt for anonymous users at count 3 or 4 (Req 6.5)
  const nudge =
    ctx.tier === 'anonymous' && (newCount === 3 || newCount === 4)
      ? {
          message: 'Register to get 50 uploads/day',
          cta: 'Sign up free',
        }
      : undefined

  return NextResponse.json(
    {
      data: gpxData,
      meta: {
        fileName: file.name,
        fileSizeBytes: file.size,
        tier: ctx.tier,
        uploadsUsed: newCount,
        uploadsLimit: rateLimit.limit === Infinity ? null : rateLimit.limit,
      },
      ...(nudge ? { nudge } : {}),
    },
    { status: 200 },
  )
}
