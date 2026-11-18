import { useCallback, useMemo } from "react"
import type { HighlightRange, Segment, WaypointSegment } from "@/lib/types"

type NavigableSegment = Segment | WaypointSegment

interface UseSegmentNavigationOptions {
  segments: NavigableSegment[]
  highlightRange: HighlightRange | null
  selectHighlight: (segment: HighlightRange) => void
  clearHighlight: () => void
}

/**
 * Provides looping segment navigation:
 * Full Route (-1) -> Segment 0 -> ... -> Segment N-1 -> Full Route (-1)
 */
export function useSegmentNavigation({
  segments,
  highlightRange,
  selectHighlight,
  clearHighlight,
}: UseSegmentNavigationOptions) {
  const activeSegmentIndex = useMemo(() => {
    if (!highlightRange || segments.length === 0) return -1
    return segments.findIndex(
      (s) =>
        s.startIndex === highlightRange.startIndex &&
        s.endIndex === highlightRange.endIndex
    )
  }, [highlightRange, segments])

  const hasSegments = segments.length > 0

  const handlePrevSegment = useCallback(() => {
    if (segments.length === 0) return
    if (activeSegmentIndex === -1) {
      selectHighlight(segments[segments.length - 1])
    } else if (activeSegmentIndex === 0) {
      clearHighlight()
    } else {
      selectHighlight(segments[activeSegmentIndex - 1])
    }
  }, [activeSegmentIndex, segments, selectHighlight, clearHighlight])

  const handleNextSegment = useCallback(() => {
    if (segments.length === 0) return
    if (activeSegmentIndex === -1) {
      selectHighlight(segments[0])
    } else if (activeSegmentIndex >= segments.length - 1) {
      clearHighlight()
    } else {
      selectHighlight(segments[activeSegmentIndex + 1])
    }
  }, [activeSegmentIndex, segments, selectHighlight, clearHighlight])

  const currentSegmentLabel =
    activeSegmentIndex >= 0
      ? "name" in segments[activeSegmentIndex]
        ? (segments[activeSegmentIndex] as WaypointSegment).name
        : (segments[activeSegmentIndex] as Segment).label
      : undefined

  return {
    activeSegmentIndex,
    hasPrevSegment: hasSegments,
    hasNextSegment: hasSegments,
    handlePrevSegment,
    handleNextSegment,
    currentSegmentLabel,
  }
}
