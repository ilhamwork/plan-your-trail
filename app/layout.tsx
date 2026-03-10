import type { Metadata } from "next";
import { Outfit } from "next/font/google";

import "./globals.css";

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Trail Analyzer — GPX Route Analysis for Trail Runners",
  description:
    "Upload your GPX file and analyze the course with detailed elevation profiles, segment analysis, and weather forecasts. Plan your race strategy like a pro.",
  openGraph: {
    title: "Trail Analyzer",
    description: "GPX route analysis tool for trail running race strategy",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontSans.variable} antialiased font-sans`}>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
