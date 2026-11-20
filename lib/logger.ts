import pino from "pino"

const isDev = process.env.NODE_ENV === "development"
const isTest = process.env.NODE_ENV === "test"

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : isTest ? "silent" : "info"),
  transport:
    isDev && typeof window === "undefined"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:HH:MM:ss",
          },
        }
      : undefined,
  base:
    typeof window === "undefined"
      ? {
          env: process.env.NODE_ENV ?? "development",
          service: "planyourtrail",
        }
      : undefined,
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "secret",
      "*.secret",
      "email",
      "*.email",
      "accessToken",
      "*.accessToken",
      "access_token",
      "*.access_token",
      "authorization",
      "*.authorization",
      "req.headers.authorization",
    ],
    censor: "[REDACTED]",
  },
  browser: {
    asObject: true,
  },
})

/**
 * Creates a child logger with bound contextual metadata (e.g. action, userId, routeId).
 */
export function childLogger(context: Record<string, unknown>) {
  return logger.child(context)
}
