// withSentryConfig lives in the /config subpath in @sentry/nextjs v11+
import sentryConfig from "@sentry/nextjs/config"
const { withSentryConfig } = sentryConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
}

export default withSentryConfig(nextConfig, {
  // No Sentry.io account — using GlitchTip. Disable all Sentry-cloud features.
  silent: true,
  sourcemaps: { disable: true },
  disableLogger: true,
  autoInstrumentServerFunctions: false,
  disableClientWebpackPlugin: true,
})

