import type { GPXData } from "./types";
import { extractGPX } from "./gpx/extract";
import { computeGPXData } from "./gpx/compute";

// ─── Parse GPX string (Sync fallback / Direct parser) ───────────────
export function parseGPXSync(gpxString: string): GPXData {
  const extracted = extractGPX(gpxString);
  return computeGPXData(extracted);
}

// Backward-compatible alias for existing sync call sites
export const parseGPX = parseGPXSync;
