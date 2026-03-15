# 🏔️ Trail Analyzer

A mobile-first GPX route analysis tool for trail runners to plan pacing, effort, and race strategy.

Upload a GPX file and instantly get an interactive map, elevation profile, segment breakdown, and weather forecast — all client-side, no login required.

## ✨ Features

- **GPX Upload** — Drag & drop `.gpx` files, parsed entirely client-side
- **Route Map** — Interactive 2D (Leaflet) and 3D terrain (MapLibre GL) with satellite toggle
- **Elevation Profile** — Recharts area chart with hover-to-map sync and waypoint markers
- **Segment Breakdown** — Auto-detected gradient segments with distance-adaptive merging
- **Gradient Distribution** — Bar chart visualization of terrain effort (Climb, Uphill, Flat, etc.)
- **Key Metrics** — Total distance, elevation gain/loss, highest/lowest point, etc.
- **Share Card** — Generate a beautiful, downloadable image of route metrics.
- **Weather Prediction** — Enhanced Open-Meteo integration with 14-day forecasts and 2-year historical data
- **Feedback & Support** — Integrated user feedback system and support/donation section
- **Responsive Layout** — Mobile-first design for on-trail use and desktop-ready analysis

## 🛠️ Tech Stack

| Category     | Technology                           |
| ------------ | ------------------------------------ |
| Framework    | Next.js 16 (App Router, Turbopack)   |
| Language     | TypeScript                           |
| Styling      | Tailwind CSS v4 + shadcn/ui          |
| 2D Map       | Leaflet + OpenStreetMap              |
| 3D Map       | MapLibre GL JS + Terrarium DEM tiles |
| Charts       | Recharts                             |
| GPX Parsing  | @mapbox/togeojson                    |
| Image Export | html-to-image                        |
| Animations   | Framer Motion                        |
| Weather      | Open-Meteo (Historical + Forecast)   |
| Analytics    | Vercel Analytics & Speed Insights    |
| Icons        | Lucide React                         |

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
plan-your-trail/
├── app/
│   ├── globals.css          # Trail-running theme & Leaflet styles
│   ├── layout.tsx           # Root layout with SEO & Analytics
│   └── page.tsx             # Main page with empty/loaded states
├── components/
│   ├── trail/
│   │   ├── Header.tsx       # Sticky navigation
│   │   ├── UploadCard.tsx   # Drag & drop GPX upload
│   │   ├── MetricsPanel.tsx # Route statistics grid
│   │   ├── MapView.tsx      # Hybrid 2D/3D component
│   │   ├── ElevationChart.tsx # Interactive profile with waypoint markers
│   │   ├── SegmentList.tsx  # Dynamic segment accordion
│   │   ├── GradientDistribution.tsx # Visual terrain breakdown
│   │   ├── WeatherForecast.tsx # Enhanced weather widget (Historical + Forecast)
│   │   ├── ShareModal.tsx   # Export & sharing options
│   │   ├── ShareCard.tsx    # Multi-aspect ratio image generator
│   │   ├── FeedbackModal.tsx # User feedback form
│   │   └── DonationSection.tsx # Support the tool
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   ├── types.ts             # Shared TypeScript interfaces
│   ├── gpx-parser.ts        # GPX parsing + Haversine distance
│   ├── segment-analysis.ts  # Segment detection logic
│   └── utils.ts             # Utility functions
└── public/
    └── Rinjani-162K-2025.gpx # Sample GPX file for testing
```

## 🎨 Design

- **Colors**: Dark forest green `#1B4332`, accent orange `#E76F51`, off-white `#FAF6F1`
- **Font**: [Outfit](https://fonts.google.com/specimen/Outfit)
- **Style**: Rounded cards, soft shadows, high-contrast for sunlight readability

## 📝 Segment Types

| Type           | Gradient   |
| -------------- | ---------- |
| Climb          | > +8%      |
| Uphill         | +3% to +8% |
| Flat / Rolling | -3% to +3% |
| Downhill       | -3% to -8% |
| Steep Descent  | < -8%      |

Minimum segment length scales with total route distance to avoid excessive fragmentation.

## 📄 License

MIT

---

_Built by trail runner, for trail runners._
