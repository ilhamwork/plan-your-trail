import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "../db"
import * as schema from "../db/schema"
import { env } from "../env"
import { sendVerificationEmail, sendPasswordResetEmail } from "../email/client"
import { upsertProfile } from "../db/queries/profiles"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret:
    env().BETTER_AUTH_SECRET ||
    "default_secret_at_least_32_characters_for_dev_test_only_0123456789",
  baseURL:
    env().BETTER_AUTH_URL ||
    env().NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000",
  trustedOrigins: async (request) => {
    const trusted = [
      env().BETTER_AUTH_URL,
      env().NEXT_PUBLIC_APP_URL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      "http://192.168.137.1:3000",
      "http://192.168.137.1:3001",
    ].filter(Boolean) as string[]

    const origin = request?.headers?.get?.("origin")
    if (process.env.NODE_ENV !== "production" && origin) {
      try {
        const url = new URL(origin)
        const hostname = url.hostname
        if (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname === "::1" ||
          hostname.startsWith("192.168.") ||
          hostname.startsWith("10.") ||
          hostname.startsWith("172.")
        ) {
          trusted.push(origin)
        }
      } catch {
        // ignore invalid URL
      }
    }

    return trusted
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        url,
        name: user.name,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        to: user.email,
        url,
        name: user.name,
      })
    },
  },
  socialProviders: {
    ...(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env().GOOGLE_CLIENT_ID!,
            clientSecret: env().GOOGLE_CLIENT_SECRET!,
          },
        }
      : {}),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          try {
            await upsertProfile(createdUser.id, "free")
          } catch (e) {
            console.error("Failed to auto-create profile on signup:", e)
          }
        },
      },
    },
  },
})
