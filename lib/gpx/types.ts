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
export const ERR_GPX_TOO_LARGE = "Invalid GPX file: File exceeds maximum allowed size";
export const ERR_XML_ENTITY = "Invalid GPX file: External XML entities or DTD declarations are not allowed";
export const ERR_MAX_POINTS = "Invalid GPX file: Track exceeds maximum allowed point count";
