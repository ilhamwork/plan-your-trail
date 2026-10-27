"use client"

import { useState, useCallback, useSyncExternalStore } from "react"
import { useSession } from "@/lib/auth/client"

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

function getStoredRunnerName(): string | null {
  try {
    return sessionStorage.getItem("runnerName")
  } catch {
    return null
  }
}

function getStoredRunnerMode(): string | null {
  try {
    return sessionStorage.getItem("runnerMode")
  } catch {
    return null
  }
}

export function useRunnerSession() {
  const { data: sessionData, isPending } = useSession()
  const [overrideName, setOverrideName] = useState<string | null>(null)
  const [modalDismissed, setModalDismissed] = useState(false)

  const storedName = useSyncExternalStore(
    subscribe,
    getStoredRunnerName,
    () => null
  )

  const storedMode = useSyncExternalStore(
    subscribe,
    getStoredRunnerMode,
    () => null
  )

  const authName = sessionData?.user
    ? sessionData.user.name?.trim() ||
      sessionData.user.email?.split("@")[0] ||
      "Pelari"
    : null

  const sessionRunnerName = overrideName || authName || storedName || ""

  const hasChosenMode =
    modalDismissed || storedName !== null || storedMode !== null
  const showSessionModal = !isPending && !authName && !hasChosenMode

  const handleSessionNameSubmit = useCallback((name: string) => {
    const finalName = name.trim() || "Pelari"
    try {
      sessionStorage.setItem("runnerName", finalName)
      sessionStorage.setItem("runnerMode", "guest")
      window.dispatchEvent(new Event("storage"))
    } catch {
      // ignore
    }
    setOverrideName(finalName)
    setModalDismissed(true)
  }, [])

  return {
    sessionRunnerName,
    showSessionModal,
    setShowSessionModal: setModalDismissed,
    handleSessionNameSubmit,
  }
}



