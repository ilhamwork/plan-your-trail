# 🏔️ Trail Analyzer

A mobile-first GPX route analysis tool for trail runners to plan pacing, effort, and race strategy.

Upload a GPX file and instantly get an interactive map, elevation profile, segment breakdown, and weather forecast — all client-side, no login required.

## ✨ Features

- **GPX Upload** — Drag & drop `.gpx` files, parsed entirely client-side
- **Route Map** — Interactive 2D (Leaflet) and 3D terrain (MapLibre GL) with satellite toggle
- **Elevation Profile** — Recharts area chart with hover-to-map sync and waypoint markers
- **Segment Analysis** — Auto-detected gradient segments (climb, uphill, flat, downhill, descent) with distance-adaptive merging
- **Key Metrics** — Total distance, elevation gain/loss, highest/lowest point, waypoint count
- **Weather Forecast** — Open-Meteo API with temperature, rain, wind, humidity, UV index, sunrise/sunset
- **Responsive Layout** — Single column on mobile, two-column with sticky sidebar on desktop

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| 2D Map | Leaflet + OpenStreetMap |
| 3D Map | MapLibre GL JS + Terrarium DEM tiles |
| Charts | Recharts |
| GPX Parsing | @mapbox/togeojson |
| Animations | Framer Motion |
| Weather | Open-Meteo (free, no API key) |
| Icons | Lucide React |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone <repo-url>
cd trail-analyzer
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## 📁 Project Structure

```
trail-analyzer/
├── app/
│   ├── globals.css          # Trail-running theme & Leaflet styles
│   ├── layout.tsx           # Root layout, Outfit font, SEO metadata
│   └── page.tsx             # Main page with empty/loaded states
├── components/
│   ├── trail/
│   │   ├── Header.tsx       # Dark green sticky header
│   │   ├── UploadCard.tsx   # Drag & drop GPX upload
│   │   ├── MetricsPanel.tsx # 2×3 compact stat cards
│   │   ├── MapView.tsx      # Leaflet 2D + MapLibre GL 3D
│   │   ├── ElevationChart.tsx # Interactive elevation profile
│   │   ├── SegmentList.tsx  # Expandable segment accordion
│   │   ├── WeatherForecast.tsx # Open-Meteo weather widget
│   │   └── Footer.tsx       # Footer
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   ├── types.ts             # Shared TypeScript interfaces
│   ├── gpx-parser.ts        # GPX parsing + Haversine distance
│   ├── segment-analysis.ts  # Gradient-based segment detection
│   └── utils.ts             # cn() utility
└── public/
    └── test.gpx             # Sample GPX file for testing
```

## 🎨 Design

- **Colors**: Dark forest green `#1B4332`, accent orange `#E76F51`, off-white `#FAF6F1`
- **Font**: [Outfit](https://fonts.google.com/specimen/Outfit)
- **Style**: Rounded cards, soft shadows, high-contrast for sunlight readability

## 📝 Segment Types

| Type | Gradient |
|------|----------|
| Climb | > +8% |
| Uphill | +3% to +8% |
| Flat / Rolling | -3% to +3% |
| Downhill | -3% to -8% |
| Steep Descent | < -8% |

Minimum segment length scales with total route distance to avoid excessive fragmentation.

## 📄 License

MIT

---

*Built by trail runner, for trail runners.*
