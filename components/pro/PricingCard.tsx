"use client"

import { Check, Sparkles } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PricingCardProps {
  tier: "anonymous" | "free" | "pro"
  features: string[]
  price: string
  introPrice?: string
  isRecommended?: boolean
  ctaLabel: string
  onCta?: () => void
}

// ---------------------------------------------------------------------------
// Tier display config
// ---------------------------------------------------------------------------

const TIER_CONFIG: Record<
  PricingCardProps["tier"],
  { label: string; color: string; bg: string; borderColor: string }
> = {
  anonymous: {
    label: "Anonymous",
    color: "text-gray-600",
    bg: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  free: {
    label: "Free",
    color: "text-[#1B4332]",
    bg: "bg-[#1B4332]/5",
    borderColor: "border-[#1B4332]/20",
  },
  pro: {
    label: "Pro",
    color: "text-[#E76F51]",
    bg: "bg-[#E76F51]/5",
    borderColor: "border-[#E76F51]/30",
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Pricing tier card.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
export function PricingCard({
  tier,
  features,
  price,
  introPrice,
  isRecommended,
  ctaLabel,
  onCta,
}: PricingCardProps) {
  const config = TIER_CONFIG[tier]

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 bg-white shadow-sm transition-shadow hover:shadow-md ${
        isRecommended
          ? "border-[#E76F51] shadow-md ring-2 ring-[#E76F51]/20"
          : config.borderColor
      } ${isRecommended ? "mt-4" : ""}`}
    >
      {/* "Most Popular" badge */}
      {isRecommended && (
        <div className="absolute -top-4 right-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E76F51] px-3 py-1 text-[11px] font-bold text-white shadow">
            <Sparkles className="h-2.5 w-2.5" />
            Most Popular
          </span>
        </div>
      )}

      {/* Tier header */}
      <div className={`px-6 pt-6 pb-4 ${isRecommended ? "pt-8" : ""}`}>
        <div className="flex items-center justify-between">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${config.bg} ${config.color}`}
          >
            {config.label}
          </span>
        </div>

        {/* Price block */}
        <div className="mt-4">
          {introPrice ? (
            <>
              {/* Intro price row */}
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-[#2D3436]">
                  {introPrice}
                </span>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Intro price
                </span>
              </div>
              {/* Regular renewal price */}
              <p className="mt-0.5 text-xs text-gray-400">
                then {price} on renewal
              </p>
            </>
          ) : (
            <span className="text-2xl font-extrabold text-[#2D3436]">
              {price}
            </span>
          )}
        </div>
      </div>

      {/* Feature list */}
      <div className="flex-1 px-6 pb-4">
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1B4332]" />
              <span className="text-xs text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        <button
          onClick={onCta}
          className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition active:scale-95 ${
            isRecommended
              ? "bg-[#E76F51] text-white hover:bg-[#E76F51]/90 shadow-sm"
              : tier === "pro"
                ? "bg-[#1B4332] text-white hover:bg-[#1B4332]/90"
                : "border border-gray-200 bg-white text-[#2D3436] hover:bg-gray-50"
          }`}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}
