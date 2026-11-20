import * as Sentry from "@sentry/nextjs"
import { env } from "./lib/env"

const dsn = env().GLITCHTIP_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === "production",
    beforeSend(event) {
      // Strip PII before sending error event to GlitchTip
      if (event.user) {
        delete event.user.email
        delete event.user.username
      }
      return event
    },
  })
}

