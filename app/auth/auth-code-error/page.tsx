"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { AlertCircle, ArrowLeft, Home } from "lucide-react"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const getErrorMessage = (err: string | null) => {
    switch (err) {
      case "no_code":
        return "No authorization code was provided by the provider."
      case "token_exchange_failed":
        return "Failed to exchange authorization code for an access token."
      case "internal_error":
        return "An unexpected error occurred on our server during authentication."
      case "user_creation_failed":
        return "We couldn't create your account. Please try again later."
      default:
        return err || "An unknown authentication error occurred."
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-8 shadow-xl"
    >
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle className="h-10 w-10" />
      </div>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Authentication Error
      </h1>
      <p className="mb-8 text-gray-500">
        {getErrorMessage(error)}
      </p>

      <div className="flex flex-col gap-3">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#1B4332] py-3 font-bold text-white transition-all hover:bg-[#1B4332]/90 active:scale-95"
        >
          <Home className="h-4 w-4" />
          Back to Home
        </Link>
        <button
          onClick={() => window.history.back()}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    </motion.div>
  )
}

export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF6F1] p-4 text-center">
      <Suspense fallback={
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl animate-pulse">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-gray-100" />
          <div className="mx-auto h-8 w-48 rounded bg-gray-100 mb-4" />
          <div className="mx-auto h-4 w-64 rounded bg-gray-100 mb-8" />
          <div className="space-y-3">
            <div className="h-12 w-full rounded-xl bg-gray-100" />
            <div className="h-12 w-full rounded-xl bg-gray-100" />
          </div>
        </div>
      }>
        <AuthErrorContent />
      </Suspense>
    </div>
  )
}
