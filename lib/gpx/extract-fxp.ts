import { XMLParser, XMLValidator } from "fast-xml-parser";
import { ExtractedGPX, RawPt, RawWpt, ERR_XML } from "./types";

const ARR = new Set(["trk", "trkseg", "trkpt", "rte", "rtept", "wpt"]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => ARR.has(name),
});

function txt(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) {
    const textVal = (v as Record<string, unknown>)["#text"];
    return typeof textVal === "string" ? textVal : "";
  }
  return String(v);
}

interface FxpNode {
  ele?: unknown;
  "@_lat"?: string;
  "@_lon"?: string;
  name?: unknown;
}

function pt(n: FxpNode): RawPt {
  let ele = parseFloat(txt(Array.isArray(n.ele) ? n.ele[0] : n.ele));
  if (isNaN(ele)) ele = 0;
  return {
    lat: parseFloat(n["@_lat"] || "0"),
    lon: parseFloat(n["@_lon"] || "0"),
    ele,
  };
}

interface FxpGpx {
  trk?: Array<{ trkseg?: Array<{ trkpt?: FxpNode[] }> }>;
  rte?: Array<{ rtept?: FxpNode[] }>;
  wpt?: FxpNode[];
}

export function extractFxp(text: string, validate = true): ExtractedGPX {
  if (validate && XMLValidator.validate(text) !== true) throw new Error(ERR_XML);
  let root: unknown;
  try {
    root = parser.parse(text);
  } catch {
    throw new Error(ERR_XML);
  }
  const gpx = (root as Record<string, unknown>)?.gpx as FxpGpx | undefined;
  if (!gpx || typeof gpx !== "object") throw new Error(ERR_XML);

  const lines: RawPt[][] = [];
  for (const trk of gpx.trk || []) {
    for (const seg of (trk && trk.trkseg) || []) {
      const pts: RawPt[] = (seg && seg.trkpt ? seg.trkpt : []).map(pt);
      if (pts.length >= 2) lines.push(pts);
    }
  }
  for (const rte of gpx.rte || []) {
    const pts: RawPt[] = (rte && rte.rtept ? rte.rtept : []).map(pt);
    if (pts.length >= 2) lines.push(pts);
  }

  const waypoints: RawWpt[] = [];
  for (const w of gpx.wpt || []) {
    const node = typeof w === "object" && w ? w : {};
    waypoints.push({
      name: txt(Array.isArray(node.name) ? node.name[0] : node.name) || "Waypoint",
      lat: parseFloat(node["@_lat"] || "0"),
      lon: parseFloat(node["@_lon"] || "0"),
      ele: parseFloat(txt(Array.isArray(node.ele) ? node.ele[0] : node.ele) || "0"),
    });
  }
  return { lines, waypoints };
}
