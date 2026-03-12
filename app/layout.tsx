import type { Metadata } from "next"
import { Outfit } from "next/font/google"

import "./globals.css"

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "Plan Your Trail — GPX Route Analysis for Trail Runners",
  description:
    "Upload your GPX file and analyze the course with detailed elevation profiles, segment analysis, and weather forecasts. Plan your race strategy like a pro.",
  openGraph: {
    title: "Plan Your Trail",
    description: "GPX route analysis tool for trail running race strategy",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${fontSans.variable} font-sans antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
