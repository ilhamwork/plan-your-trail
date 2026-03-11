"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Map, BarChart3, Layers, CloudSun } from "lucide-react";

import type { ParsedRoute, TrackPoint, Segment, WaypointSegment } from "@/lib/types";
import { parseGPX } from "@/lib/gpx-parser";

import { Header } from "@/components/trail/Header";
import { UploadCard } from "@/components/trail/UploadCard";
import { MetricsPanel } from "@/components/trail/MetricsPanel";
import { ElevationChart } from "@/components/trail/ElevationChart";
import { SegmentList } from "@/components/trail/SegmentList";
import { WeatherForecast } from "@/components/trail/WeatherForecast";
import { GradientDistribution } from "@/components/trail/GradientDistribution";
import { Footer } from "@/components/trail/Footer";

// Dynamic import for MapView (no SSR — Leaflet + MapLibre need window)
const MapView = dynamic(
  () => import("@/components/trail/MapView").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[350px] items-center justify-center rounded-xl bg-gray-100 lg:h-[450px]">
        <div className="text-sm text-gray-400">Loading map...</div>
      </div>
    ),
  }
);

// ─── Feature cards for empty state ─────────────────────────────────
const FEATURES = [
  {
    icon: Map,
    title: "Route Map",
    desc: "Interactive topographic map",
    color: "text-[#1B4332]",
    bg: "bg-[#1B4332]/5",
  },
  {
    icon: BarChart3,
    title: "Elevation Profile",
    desc: "Detailed elevation chart",
    color: "text-[#E76F51]",
    bg: "bg-[#E76F51]/5",
  },
  {
    icon: Layers,
    title: "Segment Analysis",
    desc: "Auto-detected segments",
    color: "text-[#1B4332]",
    bg: "bg-[#1B4332]/5",
  },
  {
    icon: CloudSun,
    title: "Weather Forecast",
    desc: "Forecast along the route",
    color: "text-[#E76F51]",
    bg: "bg-[#E76F51]/5",
  },
];

export default function Home() {
  const [route, setRoute] = useState<ParsedRoute | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
  const [highlightRange, setHighlightRange] = useState<{ startIndex: number; endIndex: number } | null>(null);

  const handleFileLoaded = useCallback((content: string, name: string) => {
    try {
      setError("");
      const parsed = parseGPX(content);
      setRoute(parsed);
      setFileName(name);
      setHighlightRange(null);
      setHoveredPoint(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse GPX file"
      );
      setRoute(null);
      setFileName("");
    }
  }, []);

  const handleSegmentClick = useCallback(
    (segment: Segment) => {
      setHighlightRange((prev) =>
        prev?.startIndex === segment.startIndex && prev?.endIndex === segment.endIndex
          ? null
          : { startIndex: segment.startIndex, endIndex: segment.endIndex }
      );
    },
    []
  );

  const handleWaypointSegmentClick = useCallback(
    (segment: WaypointSegment) => {
      setHighlightRange((prev) =>
        prev?.startIndex === segment.startIndex && prev?.endIndex === segment.endIndex
          ? null
          : { startIndex: segment.startIndex, endIndex: segment.endIndex }
      );
    },
    []
  );

  // Memoize to avoid unnecessary re-renders
  const mapProps = useMemo(() => {
    if (!route) return null;
    return {
      points: route.points,
      waypoints: route.waypoints,
      bounds: route.bounds,
    };
  }, [route]);

  return (
    <div className="min-h-screen bg-[#FAF6F1]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* ── Empty state ───────────────────────── */}
        <AnimatePresence mode="wait">
          {!route ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-auto max-w-lg"
            >
              <UploadCard
                onFileLoaded={handleFileLoaded}
                fileName={fileName}
                error={error}
              />

              {/* Tagline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-10 text-center"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1B4332]/10">
                  <svg
                    className="h-6 w-6 text-[#1B4332]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 14l-4-4 4-4m8 0l4 4-4 4M3 20l7-7 4 4 7-7"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">
                  Analyze your trail route. Plan your strategy.
                </p>
                <p className="text-sm text-gray-500">
                  Get detailed route map, elevation, and segments.
                </p>
              </motion.div>

              {/* Feature cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 grid grid-cols-2 gap-3"
              >
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="rounded-xl bg-white p-4 shadow-sm border border-gray-100"
                  >
                    <div className={`mb-2 inline-flex rounded-lg p-2 ${f.bg}`}>
                      <f.icon className={`h-5 w-5 ${f.color}`} />
                    </div>
                    <p className="text-sm font-semibold text-[#2D3436]">
                      {f.title}
                    </p>
                    <p className="text-xs text-gray-400">{f.desc}</p>
                  </div>
                ))}
              </motion.div>

              <Footer />
            </motion.div>
          ) : (
            /* ── Loaded state ──────────────────────── */
            <motion.div
              key="loaded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-6 lg:grid-cols-[1fr_420px]"
            >
              {/* Left column (main content) */}
              <div className="flex flex-col gap-5 order-2 lg:order-1">
                {/* Map */}
                {mapProps && (
                  <MapView
                    {...mapProps}
                    hoveredPoint={hoveredPoint}
                    highlightRange={highlightRange}
                  />
                )}

                {/* Elevation chart */}
                <ElevationChart
                  points={route.points}
                  waypoints={route.waypoints}
                  onHover={setHoveredPoint}
                />

                {/* Segments */}
                <SegmentList
                  segments={route.segments}
                  waypointSegments={route.waypointSegments}
                  onSegmentClick={handleSegmentClick}
                  onWaypointSegmentClick={handleWaypointSegmentClick}
                />

                {/* Gradient Distribution */}
                <GradientDistribution points={route.points} />

                {/* Weather */}
                <WeatherForecast center={route.center} />

                <Footer />
              </div>

              {/* Right column (sidebar — sticky on desktop) */}
              <div className="order-1 lg:order-2">
                <div className="lg:sticky lg:top-[60px] flex flex-col gap-5">
                  {/* Upload card */}
                  <UploadCard
                    onFileLoaded={handleFileLoaded}
                    fileName={fileName}
                    error={error}
                  />

                  {/* Metrics */}
                  <MetricsPanel stats={route.stats} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
