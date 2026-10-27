import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "./better-auth"
import { getProfile } from "../db/queries/profiles"

export type SessionUser = {
  id: string
  email: string
  plan: "free" | "pro"
}

let testSession: { user: SessionUser } | null = null

/**
 * Helper for tests to mock an active session.
 */
export function setSessionForTesting(
  session: { user: SessionUser } | null
): void {
  testSession = session
}

/**
 * Retrieves the current session user and plan.
 * Returns null if unauthenticated.
 */
export async function getSession(): Promise<{ user: SessionUser } | null> {
  if (testSession !== null) {
    return testSession
  }

  try {
    const headerList = await headers()
    const session = await auth.api.getSession({
      headers: headerList,
    })

    if (!session?.user) {
      return null
    }

    let plan: "free" | "pro" = "free"
    try {
      const userProfile = await getProfile(session.user.id)
      if (
        userProfile &&
        (userProfile.plan === "free" || userProfile.plan === "pro")
      ) {
        plan = userProfile.plan
      }
    } catch {
      plan = "free"
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        plan,
      },
    }
  } catch {
    return null
  }
}

/**
 * Requires an authenticated user session.
 * Redirects to /login or throws if unauthenticated.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession()
  if (!session?.user) {
    redirect("/login")
    throw new Error("Unauthorized")
  }
  return session.user
}

/**
 * Signs out the current session.
 */
export async function signOut(): Promise<void> {
  try {
    const headerList = await headers()
    await auth.api.signOut({
      headers: headerList,
    })
  } catch {
    // Graceful fallback if headers() unavailable
  }
  testSession = null
}
