"use client"

import { useState, useEffect, useCallback } from "react"

export function useRunnerSession() {
  const [sessionRunnerName, setSessionRunnerName] = useState<string>("")
  const [showSessionModal, setShowSessionModal] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem("runnerName")
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessionRunnerName(saved)
    } else {
      setShowSessionModal(true)
    }
  }, [])

  const handleSessionNameSubmit = useCallback((name: string) => {
    setSessionRunnerName(name)
    sessionStorage.setItem("runnerName", name)
    setShowSessionModal(false)
  }, [])

  return {
    sessionRunnerName,
    showSessionModal,
    setShowSessionModal,
    handleSessionNameSubmit,
  }
}
