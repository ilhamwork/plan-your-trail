export interface TrackPoint {
  lat: number;
  lon: number;
  ele: number;
  distance: number; // cumulative distance in meters
  gradient: number; // gradient in percent
}

export interface Waypoint {
  name: string;
  lat: number;
  lon: number;
  ele: number;
  distance: number; // cumulative distance along the track in meters
}

export interface RouteStats {
  totalDistance: number; // meters
  elevationGain: number; // meters
  elevationLoss: number; // meters
  highestPoint: number; // meters
  lowestPoint: number; // meters
  waypointCount: number;
}

export type SegmentType =
  | "climb"
  | "uphill"
  | "flat"
  | "downhill"
  | "descent";

export interface Segment {
  id: number;
  type: SegmentType;
  label: string;
  startKm: number;
  endKm: number;
  distance: number; // meters
  elevationChange: number; // meters (positive = gain)
  elevationGain: number;
  elevationLoss: number;
  avgGradient: number; // percent
  startElevation: number;
  endElevation: number;
  startIndex: number;
  endIndex: number;
}

export interface WaypointSegment {
  id: number;
  name: string;
  distance: number; // meters
  startElevation: number;
  endElevation: number;
  elevationGain: number;
  elevationLoss: number;
  startIndex: number;
  endIndex: number;
}

export interface GPXData {
  trackPoints: TrackPoint[];
  stats: RouteStats;
  segments: Segment[];
  waypointSegments: WaypointSegment[];
  waypoints: Waypoint[];
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
  center: [number, number]; // [lat, lon]
}
