import type { TrackPoint, Segment, SegmentType, Waypoint, WaypointSegment } from "./types";

// ─── Gradient → Segment type ───────────────────────────────────────
function getSegmentType(gradient: number): SegmentType {
  if (gradient > 8) return "climb";
  if (gradient > 3) return "uphill";
  if (gradient < -8) return "descent";
  if (gradient < -3) return "downhill";
  return "flat";
}

// ─── Segment type labels ───────────────────────────────────────────
const SEGMENT_LABELS: Record<SegmentType, string> = {
  climb: "Major Climb",
  uphill: "Uphill",
  flat: "Rolling / Flat",
  downhill: "Downhill",
  descent: "Steep Descent",
};

// ─── Minimum segment length based on total distance ────────────────
function getMinSegmentLength(totalDistance: number): number {
  // Scale minimum segment length with total route distance
  // Short routes (< 10km): min 300m
  // Medium routes (10-30km): min 500-1000m
  // Long routes (> 30km): min 1000-2000m
  const distKm = totalDistance / 1000;
  if (distKm < 10) return 300;
  if (distKm < 20) return 500;
  if (distKm < 30) return 800;
  if (distKm < 50) return 1000;
  return 1500;
}

// ─── Analyze segments ──────────────────────────────────────────────
export function analyzeSegments(
  points: TrackPoint[],
  totalDistance: number
): Segment[] {
  if (points.length < 2) return [];

  const minLength = getMinSegmentLength(totalDistance);

  // Step 1: Calculate rolling average gradient over a window
  const windowSize = Math.max(5, Math.floor(points.length / 200));
  const avgGradients: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - windowSize);
    const end = Math.min(points.length - 1, i + windowSize);
    const distSpan = points[end].distance - points[start].distance;
    const eleSpan = points[end].ele - points[start].ele;
    avgGradients.push(distSpan > 0 ? (eleSpan / distSpan) * 100 : 0);
  }

  // Step 2: Build raw segments
  interface RawSegment {
    type: SegmentType;
    startIndex: number;
    endIndex: number;
  }

  const rawSegments: RawSegment[] = [];
  let currentType = getSegmentType(avgGradients[0]);
  let segStart = 0;

  for (let i = 1; i < points.length; i++) {
    const type = getSegmentType(avgGradients[i]);
    if (type !== currentType) {
      rawSegments.push({ type: currentType, startIndex: segStart, endIndex: i - 1 });
      currentType = type;
      segStart = i;
    }
  }
  rawSegments.push({
    type: currentType,
    startIndex: segStart,
    endIndex: points.length - 1,
  });

  // Step 3: Merge short segments into neighbors
  const merged: RawSegment[] = [rawSegments[0]];
  for (let i = 1; i < rawSegments.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = rawSegments[i];
    const currDist =
      points[curr.endIndex].distance - points[curr.startIndex].distance;

    if (currDist < minLength) {
      // Merge into previous segment
      prev.endIndex = curr.endIndex;
    } else {
      merged.push(curr);
    }
  }

  // Step 4: Re-merge any remaining short segments after the first pass
  const finalMerged: RawSegment[] = [merged[0]];
  for (let i = 1; i < merged.length; i++) {
    const prev = finalMerged[finalMerged.length - 1];
    const curr = merged[i];
    const currDist =
      points[curr.endIndex].distance - points[curr.startIndex].distance;

    if (currDist < minLength * 0.5) {
      prev.endIndex = curr.endIndex;
    } else {
      finalMerged.push(curr);
    }
  }

  // Step 5: Recalculate types based on exact start/end elevation
  const preFinalSegments = finalMerged.map((raw) => {
    const startPt = points[raw.startIndex];
    const endPt = points[raw.endIndex];
    const distance = endPt.distance - startPt.distance;
    const elevationChange = endPt.ele - startPt.ele;
    const avgGrad = distance > 0 ? (elevationChange / distance) * 100 : 0;
    
    return {
      type: getSegmentType(avgGrad),
      startIndex: raw.startIndex,
      endIndex: raw.endIndex,
    };
  });

  // Step 6: Merge adjacent segments of the identical exact type
  const mergedSameType: { type: SegmentType; startIndex: number; endIndex: number }[] = [];
  for (const seg of preFinalSegments) {
    if (mergedSameType.length === 0) {
      mergedSameType.push(seg);
    } else {
      const last = mergedSameType[mergedSameType.length - 1];
      if (last.type === seg.type) {
        last.endIndex = seg.endIndex;
      } else {
        mergedSameType.push(seg);
      }
    }
  }

  // Step 7: Build final Segment objects with full stats
  return mergedSameType.map((raw, idx) => {
    const startPt = points[raw.startIndex];
    const endPt = points[raw.endIndex];
    const distance = endPt.distance - startPt.distance;

    let gain = 0;
    let loss = 0;
    for (let i = raw.startIndex + 1; i <= raw.endIndex; i++) {
      const diff = points[i].ele - points[i - 1].ele;
      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);
    }

    const elevationChange = endPt.ele - startPt.ele;
    const avgGrad = distance > 0 ? (elevationChange / distance) * 100 : 0;

    return {
      id: idx,
      type: raw.type,
      label: SEGMENT_LABELS[raw.type],
      startKm: startPt.distance / 1000,
      endKm: endPt.distance / 1000,
      distance,
      elevationChange: Math.round(elevationChange),
      elevationGain: Math.round(gain),
      elevationLoss: Math.round(loss),
      avgGradient: Math.round(avgGrad * 10) / 10,
      startElevation: Math.round(startPt.ele),
      endElevation: Math.round(endPt.ele),
      startIndex: raw.startIndex,
      endIndex: raw.endIndex,
    };
  });
}

// ─── Waypoint-based segments ───────────────────────────────────────
export function buildWaypointSegments(
  points: TrackPoint[],
  waypoints: Waypoint[]
): WaypointSegment[] {
  if (waypoints.length === 0) return [];

  // Build boundaries: Start → WP1 → WP2 → ... → Finish
  const boundaries: { name: string; index: number }[] = [];

  // Find closest point index for each waypoint
  for (const wp of waypoints) {
    let minDist = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].distance - wp.distance);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }
    boundaries.push({ name: wp.name, index: closestIdx });
  }

  // Add finish
  boundaries.push({ name: "Finish", index: points.length - 1 });

  const segments: WaypointSegment[] = [];
  let prevIndex = 0;

  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    const startPt = points[prevIndex];
    const endPt = points[b.index];
    const distance = endPt.distance - startPt.distance;

    let gain = 0;
    let loss = 0;
    for (let j = prevIndex + 1; j <= b.index; j++) {
      const diff = points[j].ele - points[j - 1].ele;
      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);
    }

    segments.push({
      id: i,
      name: b.name,
      distance,
      startElevation: Math.round(startPt.ele),
      endElevation: Math.round(endPt.ele),
      elevationGain: Math.round(gain),
      elevationLoss: Math.round(loss),
      startIndex: prevIndex,
      endIndex: b.index,
    });

    prevIndex = b.index;
  }

  return segments;
}
