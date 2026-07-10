import { NextResponse } from 'next/server'
import { resolveTier, requireTier } from '@/lib/access-guard'
import type { GPXData } from '@/lib/types'

// ---------------------------------------------------------------------------
// POST /api/export/pdf
// Generates and returns a PDF race brief for the given route.
// Pro-gated — Requirements: 3.6, 3.11
//
// Body:
//   routeData  (required) — GPXData object
//   raceName   (optional) — string title for the PDF header
//   raceDate   (optional) — YYYY-MM-DD string
//
// Returns:
//   Content-Type: application/pdf — binary PDF payload
//
// NOTE: No PDF generation library is currently installed in this project
// (puppeteer, @react-pdf/renderer, jsPDF, etc. are absent from package.json).
// This handler is fully gated and validates the request; the PDF generation
// step is a TODO stub that returns a minimal valid PDF placeholder until a
// library is added.
// TODO: Replace the stub response with a real PDF generation library once one
// is installed (e.g. `npm install @react-pdf/renderer`).
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Resolve tier — always first, never trust client-supplied values (Req 2.7)
  let ctx
  try {
    ctx = await resolveTier()
  } catch (res) {
    return res as Response
  }

  // 2. Enforce Pro tier — return 403 without executing any operation (Req 3.6, 3.11)
  try {
    requireTier(ctx, 'pro')
  } catch (res) {
    return res as Response
  }

  // 3. Parse and validate body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Invalid JSON body' } },
      { status: 400 },
    )
  }

  const { routeData, raceName, raceDate } = body as {
    routeData?: GPXData
    raceName?: string
    raceDate?: string
  }

  if (!routeData || typeof routeData !== 'object') {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELD', message: 'routeData is required' } },
      { status: 400 },
    )
  }

  if (!Array.isArray(routeData.trackPoints) || routeData.trackPoints.length === 0) {
    return NextResponse.json(
      { error: { code: 'INVALID_DATA', message: 'routeData must include at least one trackPoint' } },
      { status: 400 },
    )
  }

  const titleText = typeof raceName === 'string' && raceName.trim()
    ? raceName.trim()
    : 'Route Analysis'
  const dateText = typeof raceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raceDate)
    ? raceDate
    : new Date().toISOString().slice(0, 10)

  // TODO: Implement actual PDF generation here once a library is installed.
  // Suggested approach with @react-pdf/renderer:
  //
  //   import { renderToBuffer } from '@react-pdf/renderer'
  //   import { RaceBriefDocument } from '@/components/pdf/RaceBriefDocument'
  //
  //   const buffer = await renderToBuffer(
  //     <RaceBriefDocument
  //       routeData={routeData}
  //       raceName={titleText}
  //       raceDate={dateText}
  //     />
  //   )
  //   return new Response(buffer, {
  //     status: 200,
  //     headers: {
  //       'Content-Type': 'application/pdf',
  //       'Content-Disposition': `attachment; filename="${titleText.replace(/\s+/g, '_')}.pdf"`,
  //     },
  //   })

  // Stub: return a minimal valid PDF placeholder so the gating and validation
  // logic can be verified without a PDF library installed.
  const stats = routeData.stats
  const stubContent = [
    `Race Brief — ${titleText}`,
    `Date: ${dateText}`,
    `Distance: ${stats ? (stats.totalDistance / 1000).toFixed(2) : '?'} km`,
    `Elevation Gain: ${stats?.elevationGain ?? '?'} m`,
    `Elevation Loss: ${stats?.elevationLoss ?? '?'} m`,
    `Highest Point: ${stats?.highestPoint ?? '?'} m`,
    `Waypoints: ${stats?.waypointCount ?? 0}`,
  ].join('\n')

  // Minimal PDF structure (PDF 1.4 stub — valid enough to open but contains plain text)
  const pdfBody =
    `%PDF-1.4\n` +
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]\n` +
    `/Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n` +
    `4 0 obj\n<< /Length ${stubContent.length + 50} >>\nstream\n` +
    `BT /F1 12 Tf 50 750 Td\n(${stubContent.replace(/\n/g, ') Tj T* (')}) Tj\nET\nendstream\nendobj\n` +
    `xref\n0 5\n0000000000 65535 f \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n9\n%%EOF\n`

  const encoder = new TextEncoder()
  const pdfBytes = encoder.encode(pdfBody)

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${titleText.replace(/\s+/g, '_')}_${dateText}.pdf"`,
      'Content-Length': pdfBytes.byteLength.toString(),
    },
  })
}
