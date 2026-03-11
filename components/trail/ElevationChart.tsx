"use client";

import { useCallback, useMemo } from "react";
import {
  ComposedChart,
  Area,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrackPoint, Waypoint } from "@/lib/types";
import { TrendingUp } from "lucide-react";

interface ElevationChartProps {
  points: TrackPoint[];
  waypoints: Waypoint[];
  onHover: (point: TrackPoint | null) => void;
}

export function ElevationChart({
  points,
  waypoints,
  onHover,
}: ElevationChartProps) {
  // Downsample points for chart performance
  const chartData = useMemo(() => {
    const maxPoints = 500;
    const step = Math.max(1, Math.floor(points.length / maxPoints));

    const data = points
      .filter((_, i) => i % step === 0 || i === points.length - 1)
      .map((p) => ({
        distance: Math.round((p.distance / 1000) * 100) / 100,
        elevation: Math.round(p.ele),
        gradient: Math.round(p.gradient * 10) / 10,
        original: p,
        wpElevation: null as number | null,
      }));

    // Inject waypoint elevations into the closest data points
    for (const wp of waypoints) {
      let minDiff = Infinity;
      let closestIdx = 0;
      for (let i = 0; i < data.length; i++) {
        const diff = Math.abs(data[i].original.distance - wp.distance);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      data[closestIdx].wpElevation = data[closestIdx].elevation;
    }

    return data;
  }, [points, waypoints]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback(
    (state: any) => {
      if (state && state.isTooltipActive && state.activePayload && state.activePayload.length > 0) {
        onHover(state.activePayload[0].payload.original);
      } else {
        onHover(null);
      }
    },
    [onHover]
  );

  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderWaypointDot = (props: any) => {
    const { cx, cy } = props;
    if (cx == null || cy == null) return null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#E76F51"
        stroke="white"
        strokeWidth={2}
        style={{ pointerEvents: "none" }} // Prevents scatter dots from blocking tooltips/hover
      />
    );
  };

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#1B4332]" />
          <h3 className="text-sm font-bold text-[#2D3436]">
            Elevation Profile
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          Hover over the chart to see details on the map
        </p>
      </div>

      <div className="p-3">
        <ResponsiveContainer width="100%" height={100}>
          <ComposedChart
            data={chartData}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1B4332" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1B4332" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="distance"
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickFormatter={(v: number) => `${v} km`}
              axisLine={{ stroke: "#E5E7EB" }}
              tickLine={false}
              type="number"
              domain={["dataMin", "dataMax"]}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              tickFormatter={(v: number) => `${v}`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg bg-[#2D3436] px-3 py-2 text-xs text-white shadow-lg pointer-events-none">
                    <p className="font-semibold">{data.distance} km</p>
                    <p>Altitude: {data.elevation} m</p>
                    <p>Gradient: {data.gradient}%</p>
                  </div>
                );
              }}
              animationDuration={100}
            />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#1B4332"
              strokeWidth={2}
              fill="url(#elevationGradient)"
              animationDuration={1000}
              isAnimationActive={false}
            />
            {/* Waypoint dots */}
            <Scatter
              dataKey="wpElevation"
              shape={renderWaypointDot}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
