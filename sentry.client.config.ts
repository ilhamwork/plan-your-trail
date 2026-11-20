import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.05,
    enabled: process.env.NODE_ENV === "production",
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      if (event.user) {
        delete event.user.email
        delete event.user.username
      }
      return event
    },
  })
}
