import type { SegmentType } from "./types"

/**
 * Unified terrain gradient color tokens (WCAG AA >= 4.5:1 on white and #FAF6F1).
 * Shared across SegmentList pills, GradientDistribution stacked bar, and legend keys.
 */
export const TERRAIN_CATEGORY_TOKENS = {
  uphill: {
    barBg: "bg-[#E76F51]",
    swatchBg: "bg-[#E76F51]",
    text: "text-[#B9381C]",
  },
  flat: {
    barBg: "bg-[#6B7280]",
    swatchBg: "bg-[#6B7280]",
    text: "text-[#374151]",
  },
  downhill: {
    barBg: "bg-[#457B9D]",
    swatchBg: "bg-[#457B9D]",
    text: "text-[#1E4E79]",
  },
} as const

export const SEGMENT_PILL_CLASSES: Record<SegmentType, string> = {
  climb: "bg-[#E76F51]/20 text-[#9A2B13]",
  uphill: "bg-[#E76F51]/12 text-[#B9381C]",
  flat: "bg-[#E5E7EB]/85 text-[#374151]",
  downhill: "bg-[#457B9D]/14 text-[#1E4E79]",
  descent: "bg-[#457B9D]/24 text-[#163A5C]",
}
