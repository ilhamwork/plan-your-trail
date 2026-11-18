"use client"

import { useState, useCallback, useSyncExternalStore } from "react"
import { useSession } from "@/lib/auth/client"

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

function getStoredRunnerName(): string | null {
  try {
    return localStorage.getItem("runnerName")
  } catch {
    return null
  }
}

export function useRunnerSession() {
  const { data: sessionData, isPending } = useSession()
  const [overrideName, setOverrideName] = useState<string | null>(null)

  const storedName = useSyncExternalStore(
    subscribe,
    getStoredRunnerName,
    () => null
  )

  const authName = sessionData?.user
    ? sessionData.user.name?.trim() ||
      sessionData.user.email?.split("@")[0] ||
      "Pelari"
    : null

  const guestName = (overrideName ?? storedName ?? "").trim()
  const sessionRunnerName = authName || guestName

  const hasSessionIdentity = Boolean(authName || guestName)
  const showSessionModal = !isPending && !hasSessionIdentity
  const canUpload = !isPending && hasSessionIdentity

  const handleSessionNameSubmit = useCallback((name: string) => {
    const finalName = name.trim()
    if (!finalName) return
    try {
      localStorage.setItem("runnerName", finalName)
      localStorage.setItem("runnerMode", "guest")
      window.dispatchEvent(new Event("storage"))
    } catch {
      // ignore
    }
    setOverrideName(finalName)
  }, [])

  return {
    sessionRunnerName,
    showSessionModal,
    canUpload,
    handleSessionNameSubmit,
  }
}



