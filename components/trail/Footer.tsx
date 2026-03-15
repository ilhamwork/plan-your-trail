import { useState } from "react"
import { FeedbackModal } from "./FeedbackModal"

interface FooterProps {
  runnerName?: string
}

export function Footer({ runnerName }: FooterProps) {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  return (
    <footer className="pt-4 text-center">
      <p className="text-sm text-gray-500 italic">
        Built by trail runner, for trail runners.
      </p>
      <div className="mt-4 flex flex-col items-center gap-1">
        <p className="text-[12px] text-gray-400">
          Found a bug or have an idea?{" "}
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="cursor-pointer font-semibold text-[#1B4332] hover:underline"
          >
            Send feedback.
          </button>
        </p>
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} by{" "}
          <a
            href="https://instagram.com/ilhamontrail"
            className="cursor-pointer font-medium text-[#1B4332] hover:underline"
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
}
