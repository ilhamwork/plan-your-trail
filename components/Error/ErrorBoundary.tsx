"use client"

import React from "react"
import { useI18n } from "@/lib/i18n/context"

function ErrorFallback() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF6F1] p-4 text-center">
      <div className="max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="heading-2 mb-2">
          {t("errorBoundary.title")}
        </h2>
        <p className="text-subhead mb-6">
          {t("errorBoundary.description")}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-[#1B4332] px-6 py-2 text-sm font-medium text-white transition-all hover:bg-[#1B4332]/90"
        >
          {t("errorBoundary.reloadBtn")}
        </button>
      </div>
    </div>
  )
}

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }

    return this.props.children
  }
}

export default ErrorBoundary
