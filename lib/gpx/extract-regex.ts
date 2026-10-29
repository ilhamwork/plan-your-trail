import { ExtractedGPX, RawPt, RawWpt, ERR_XML, ERR_MAX_POINTS } from "./types";
import { GPX_BOUNDS } from "../entitlements/config";

const TAG_RE = /<(\/?)(trk|trkseg|trkpt|rte|rtept|wpt)(?=[\s>\/])([^>]*)>/g;
const LAT_RE = /(?:^|\s)lat\s*=\s*(?:"([^"]*)"|'([^']*)')/;
const LON_RE = /(?:^|\s)lon\s*=\s*(?:"([^"]*)"|'([^']*)')/;
const ELE_RE = /<ele(?:\s[^>]*)?>([^<]*)</;
const NAME_RE = /<name(?:\s[^>]*)?>([\s\S]*?)<\/name>/;

function attr(re: RegExp, s: string): string | null {
  const m = re.exec(s);
  return m ? (m[1] ?? m[2] ?? "") : null;
}

function decode(s: string): string {
  if (s.indexOf("&") === -1 && s.indexOf("<![CDATA[") === -1) return s;
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function basicValidate(text: string): void {
  const t = text.trimStart();
  if (t.charCodeAt(0) !== 60 /* < */) throw new Error(ERR_XML);
  if (!/<gpx[\s>]/.test(t) || !/<\/gpx\s*>\s*$/.test(text)) throw new Error(ERR_XML);
}

export function extractRegex(text: string): ExtractedGPX {
  basicValidate(text);

  const trackLines: RawPt[][] = [];
  const routeLines: RawPt[][] = [];
  const waypoints: RawWpt[] = [];

  let curLine: RawPt[] | null = null;
  let ptStart = -1;
  let ptAttrs = "";
  let inWpt = false;
  let totalPoints = 0;

  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(text)) !== null) {
    const closing = m[1] === "/";
    const name = m[2];
    const attrs = m[3];
    const selfClosing = !closing && attrs.charCodeAt(attrs.length - 1) === 47;

    switch (name) {
      case "trkseg":
        if (!closing) curLine = selfClosing ? null : [];
        else {
          if (curLine && curLine.length >= 2) trackLines.push(curLine);
          curLine = null;
        }
        break;
      case "rte":
        if (!closing) {
          curLine = selfClosing ? null : [];
        } else {
          if (curLine && curLine.length >= 2) routeLines.push(curLine);
          curLine = null;
        }
        break;
      case "trkpt":
      case "rtept":
      case "wpt": {
        const isWpt = name === "wpt";
        if (!closing) {
          if (selfClosing) {
            if (isWpt) {
              if (waypoints.length + 1 > GPX_BOUNDS.maxWaypoints) {
                throw new Error(ERR_MAX_POINTS);
              }
              waypoints.push({
                name: "Waypoint",
                lat: parseFloat(attr(LAT_RE, attrs) || "0"),
                lon: parseFloat(attr(LON_RE, attrs) || "0"),
                ele: 0,
              });
            } else if (curLine) {
              totalPoints++;
              if (totalPoints > GPX_BOUNDS.maxPoints) {
                throw new Error(ERR_MAX_POINTS);
              }
              curLine.push({
                lat: parseFloat(attr(LAT_RE, attrs) as string),
                lon: parseFloat(attr(LON_RE, attrs) as string),
                ele: 0,
              });
            }
          } else {
            ptStart = TAG_RE.lastIndex;
            ptAttrs = attrs;
            inWpt = isWpt;
          }
        } else if (ptStart >= 0) {
          const body = text.slice(ptStart, m.index);
          const eleM = ELE_RE.exec(body);
          if (inWpt && isWpt) {
            if (waypoints.length + 1 > GPX_BOUNDS.maxWaypoints) {
              throw new Error(ERR_MAX_POINTS);
            }
            const nameM = NAME_RE.exec(body);
            const eleNum = parseFloat((eleM && eleM[1]) || "0");
            waypoints.push({
              name: (nameM && decode(nameM[1])) || "Waypoint",
              lat: parseFloat(attr(LAT_RE, ptAttrs) || "0"),
              lon: parseFloat(attr(LON_RE, ptAttrs) || "0"),
              ele: eleNum,
            });
          } else if (!inWpt && !isWpt && curLine) {
            totalPoints++;
            if (totalPoints > GPX_BOUNDS.maxPoints) {
              throw new Error(ERR_MAX_POINTS);
            }
            let ele = eleM ? parseFloat(eleM[1]) : NaN;
            if (isNaN(ele)) ele = 0;
            curLine.push({
              lat: parseFloat(attr(LAT_RE, ptAttrs) as string),
              lon: parseFloat(attr(LON_RE, ptAttrs) as string),
              ele,
            });
          }
          ptStart = -1;
        }
        break;
      }
      default:
        break;
    }
  }

  return { lines: trackLines.concat(routeLines), waypoints };
}
