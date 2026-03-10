"use client";

import { useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
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
    return points
      .filter((_, i) => i % step === 0 || i === points.length - 1)
      .map((p) => ({
        distance: Math.round((p.distance / 1000) * 100) / 100,
        elevation: Math.round(p.ele),
        gradient: Math.round(p.gradient * 10) / 10,
        original: p,
      }));
  }, [points]);

  // Waypoint reference dots
  const waypointDots = useMemo(() => {
    return waypoints.map((wp) => {
      // Find closest chart point
      let minDist = Infinity;
      let closestData = chartData[0];
      for (const d of chartData) {
        const diff = Math.abs(d.original.distance - wp.distance);
        if (diff < minDist) {
          minDist = diff;
          closestData = d;
        }
      }
      return {
        name: wp.name,
        distance: closestData.distance,
        elevation: closestData.elevation,
      };
    });
  }, [waypoints, chartData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback(
    (state: any) => {
      if (state?.activePayload?.[0]) {
        onHover(state.activePayload[0].payload.original);
      }
    },
    [onHover]
  );

  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

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
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={chartData}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="elevationGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
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
                  <div className="rounded-lg bg-[#2D3436] px-3 py-2 text-xs text-white shadow-lg">
                    <p className="font-semibold">
                      {data.distance} km
                    </p>
                    <p>Altitude: {data.elevation} m</p>
                    <p>Gradient: {data.gradient}%</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#1B4332"
              strokeWidth={2}
              fill="url(#elevationGradient)"
              animationDuration={1000}
            />
            {waypointDots.map((wp, idx) => (
              <ReferenceDot
                key={idx}
                x={wp.distance}
                y={wp.elevation}
                r={5}
                fill="#E76F51"
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
