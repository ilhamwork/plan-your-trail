"use client"

import { Heart } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

export function DonationSection() {
  const { t } = useI18n()

  return (
    <div className="rounded-2xl border border-[#1B4332]/12 bg-white p-6 text-center">
      <div className="mb-2.5 flex items-center justify-center gap-2">
        <Heart className="h-4 w-4 fill-[#E76F51] text-[#E76F51]" aria-hidden="true" />
        <span className="heading-4 text-[#1B4332] uppercase tracking-wider">
          {t("donation.heading")}
        </span>
      </div>
      <p className="mx-auto mb-4 max-w-md text-sm leading-relaxed text-[#4B5563]">
        {t("donation.body")}
      </p>
      <a
        href="https://trakteer.id/ilhamontrail"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[#1B4332]/40 bg-transparent px-6 py-2.5 text-sm font-semibold text-[#1B4332] transition hover:bg-[#1B4332]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332] active:scale-[0.99]"
      >
        {t("donation.cta")}
      </a>
    </div>
  )
}
