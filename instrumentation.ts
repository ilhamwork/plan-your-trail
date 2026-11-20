import * as Sentry from "@sentry/nextjs"

// Next.js instrumentation hook — loads Sentry on the Node.js runtime.
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
}

export const onRequestError = Sentry.captureRequestError

