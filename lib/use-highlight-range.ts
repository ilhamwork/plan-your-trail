"use client"

import { useState, useCallback } from "react"
import type { HighlightRange } from "./types"

/**
 * Shared hook to track and toggle highlighted segments between map and list views.
 */
export function useHighlightRange() {
  const [highlightRange, setHighlightRange] = useState<HighlightRange | null>(
    null
  )

  const clearHighlight = useCallback(() => {
    setHighlightRange(null)
  }, [])

  const toggleHighlight = useCallback((range: HighlightRange) => {
    setHighlightRange((prev) =>
      prev?.startIndex === range.startIndex && prev?.endIndex === range.endIndex
        ? null
        : { startIndex: range.startIndex, endIndex: range.endIndex }
    )
  }, [])

  return {
    highlightRange,
    setHighlightRange,
    clearHighlight,
    toggleHighlight,
  }
}
