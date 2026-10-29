import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "./globals.css"
import ErrorBoundary from "@/components/Error/ErrorBoundary"
import { I18nProvider } from "@/lib/i18n/context"
import { getServerLocale } from "@/lib/i18n/server"

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
    locale: "id_ID",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getServerLocale()

  return (
    <html lang={locale} className={`${fontSans.variable} font-sans antialiased`}>
      <head />
      <body>
        <I18nProvider initialLocale={locale}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </I18nProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
