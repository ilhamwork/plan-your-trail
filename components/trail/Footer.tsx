"use client"

import { memo, useState } from "react"
import { FeedbackModal } from "./FeedbackModal"

interface FooterProps {
  runnerName?: string
}

export const Footer = memo(function Footer({ runnerName }: FooterProps) {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  return (
    <footer className="pt-4 text-center">
      <p className="text-sm text-[#4B5563] italic">
        Built by trail runner, for trail runners.
      </p>
      <div className="mt-3 flex flex-col items-center gap-1">
        <p className="text-xs text-[#4B5563]">
          Found a bug or have an idea?{" "}
          <button
            type="button"
            onClick={() => setIsFeedbackOpen(true)}
            className="cursor-pointer font-semibold text-[#1B4332] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
          >
            Send feedback.
          </button>
        </p>
        <p className="text-xs text-[#4B5563]">
          © {new Date().getFullYear()} by{" "}
          <a
            href="https://instagram.com/ilhamontrail"
            className="cursor-pointer font-medium text-[#1B4332] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
          >
            @ilhamontrail
          </a>
        </p>
      </div>

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        runnerName={runnerName}
      />
    </footer>
  )
})
