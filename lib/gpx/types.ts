export interface RawPt {
  lat: number;
  lon: number;
  ele: number;
}

export interface RawWpt extends RawPt {
  name: string;
}

export interface ExtractedGPX {
  lines: RawPt[][];
  waypoints: RawWpt[];
}

export const ERR_XML = "Invalid GPX file: Could not parse XML";
export const ERR_MIN_POINTS = "Invalid GPX file: Track must contain at least 2 points";
