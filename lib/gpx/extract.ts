import {
  ExtractedGPX,
  ERR_GPX_TOO_LARGE,
  ERR_XML_ENTITY,
  ERR_MAX_POINTS,
} from "./types";
import { extractRegex } from "./extract-regex";
import { extractFxp } from "./extract-fxp";
import { GPX_BOUNDS } from "../entitlements/config";

// Disallow XML entity definitions and external DTD resolution (XXE / Billion Laughs protection)
const FORBIDDEN_DTD_RE = /<!ENTITY\b|<!DOCTYPE\b[^>]*\b(?:SYSTEM|PUBLIC)\b/i;

export function assertGpxInputBounds(text: string): void {
  const byteLen =
    typeof Buffer !== "undefined"
      ? Buffer.byteLength(text, "utf-8")
      : new TextEncoder().encode(text).byteLength;

  if (byteLen > GPX_BOUNDS.maxParseBytes) {
    throw new Error(ERR_GPX_TOO_LARGE);
  }

  if (FORBIDDEN_DTD_RE.test(text)) {
    throw new Error(ERR_XML_ENTITY);
  }
}

export function assertExtractedPointBounds(extracted: ExtractedGPX): ExtractedGPX {
  let totalPoints = 0;
  for (const line of extracted.lines) {
    totalPoints += line.length;
    if (totalPoints > GPX_BOUNDS.maxPoints) {
      throw new Error(ERR_MAX_POINTS);
    }
  }
  if (extracted.waypoints.length > GPX_BOUNDS.maxWaypoints) {
    throw new Error(ERR_MAX_POINTS);
  }
  return extracted;
}

export function extractGPX(text: string): ExtractedGPX {
  assertGpxInputBounds(text);

  try {
    const res = extractRegex(text);
    // Jika regex menghasilkan 0 track lines pada file yang tampaknya tidak kosong,
    // fallback ke FXP untuk memastikan tidak ada format XML kompleks/namespaced yang terlewat.
    if (res.lines.length === 0) {
      return assertExtractedPointBounds(extractFxp(text, true));
    }
    return assertExtractedPointBounds(res);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === ERR_MAX_POINTS ||
        err.message === ERR_GPX_TOO_LARGE ||
        err.message === ERR_XML_ENTITY)
    ) {
      throw err;
    }
    // Jika regex melempar error (atau format XML tidak biasa), coba validasi ketat via fast-xml-parser
    return assertExtractedPointBounds(extractFxp(text, true));
  }
}
