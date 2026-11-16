"use client"

import { memo, useState } from "react"
import { FeedbackModal } from "./FeedbackModal"
import { useI18n } from "@/lib/i18n/context"

interface FooterProps {
  runnerName?: string
}

export const Footer = memo(function Footer({ runnerName }: FooterProps) {
  const { t } = useI18n()
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  return (
    <footer className="pt-4 text-center">
      <p className="body-base text-[#4B5563] italic">
        {t("footer.tagline")}
      </p>
      <div className="mt-3 flex flex-col items-center gap-1">
        <p className="body-sm text-[#4B5563]">
          {t("footer.feedbackPrompt")}{" "}
          <button
            type="button"
            onClick={() => setIsFeedbackOpen(true)}
            className="cursor-pointer font-semibold text-[#1B4332] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
          >
            {t("footer.feedbackAction")}
          </button>
        </p>
        <p className="body-sm text-[#4B5563]">
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
