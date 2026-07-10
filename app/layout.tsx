import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "./globals.css"

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "PlanYourTrail — GPX Trail Route Analyzer",
  description:
    "Upload your GPX file and instantly analyze route map, elevation profile, segment breakdown, and gradient distribution.",
  keywords: [
    "trail running",
    "gpx analyzer",
    "route planner",
    "elevation profile",
    "race strategy",
  ],
  authors: [{ name: "PlanYourTrail" }],
  metadataBase: new URL("https://planyourtrail.run"),
  openGraph: {
    title: "PlanYourTrail — GPX Trail Route Analyzer",
    description:
      "Upload your GPX file and instantly analyze route map, elevation profile, segment breakdown, and gradient distribution.",
    url: "https://planyourtrail.run",
    siteName: "PlanYourTrail",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "PlanYourTrail — GPX Trail Route Analyzer",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlanYourTrail — GPX Trail Route Analyzer",
    description:
      "Upload your GPX file and instantly analyze route map, elevation profile, segment breakdown, and gradient distribution.",
    images: ["/og"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

import Script from "next/script"
import ErrorBoundary from "@/components/Error/ErrorBoundary"
import { AuthProvider } from "@/contexts/AuthContext"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${fontSans.variable} font-sans antialiased`}>
      <head />
      <body>
        <AuthProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
        {/* Midtrans Snap client SDK — loaded lazily so it doesn't block page render */}
        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}
