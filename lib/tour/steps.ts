export type TourAudience = "guest" | "registered"
export type TourPhase = "empty" | "analysis"

export interface TourStep {
  id: string
  /** Comma-separated CSS selectors; the first visible match is highlighted. */
  targetSelector: string
  titleKey: string
  descriptionKey: string
  placement?: "top" | "bottom" | "auto"
}

const GUEST_EMPTY_STEPS: TourStep[] = [
  {
    id: "guest-upload",
    targetSelector: '[data-tour="upload-card"]',
    titleKey: "tour.shared.upload.title",
    descriptionKey: "tour.shared.upload.desc",
    placement: "bottom",
  },
  {
    id: "guest-auth",
    targetSelector: '[data-tour="header-auth"], [data-tour="mobile-nav-auth"]',
    titleKey: "tour.guest.empty.auth.title",
    descriptionKey: "tour.guest.empty.auth.desc",
    placement: "bottom",
  },
]

const GUEST_ANALYSIS_STEPS: TourStep[] = [
  {
    id: "guest-map",
    targetSelector: '[data-tour="map-view"]',
    titleKey: "tour.shared.map.title",
    descriptionKey: "tour.shared.map.desc",
    placement: "bottom",
  },
  {
    id: "guest-segments",
    targetSelector: '[data-tour="segment-list"]',
    titleKey: "tour.shared.segments.title",
    descriptionKey: "tour.shared.segments.desc",
    placement: "top",
  },
  {
    id: "guest-gradient",
    targetSelector: '[data-tour="gradient-distribution"]',
    titleKey: "tour.guest.analysis.gradient.title",
    descriptionKey: "tour.guest.analysis.gradient.desc",
    placement: "top",
  },
  {
    id: "guest-locked",
    targetSelector: '[data-tour="guest-locked-features"]',
    titleKey: "tour.guest.analysis.locked.title",
    descriptionKey: "tour.guest.analysis.locked.desc",
    placement: "top",
  },
]

const REGISTERED_EMPTY_STEPS: TourStep[] = [
  {
    id: "registered-upload",
    targetSelector: '[data-tour="upload-card"]',
    titleKey: "tour.shared.upload.title",
    descriptionKey: "tour.shared.upload.desc",
    placement: "bottom",
  },
  {
    id: "registered-routes",
    targetSelector: '[data-tour="nav-routes"], [data-tour="mobile-nav-routes"]',
    titleKey: "tour.registered.empty.routes.title",
    descriptionKey: "tour.registered.empty.routes.desc",
    placement: "bottom",
  },
]

const REGISTERED_ANALYSIS_STEPS: TourStep[] = [
  {
    id: "registered-map",
    targetSelector: '[data-tour="map-view"]',
    titleKey: "tour.shared.map.title",
    descriptionKey: "tour.shared.map.desc",
    placement: "bottom",
  },
  {
    id: "registered-waypoints",
    targetSelector: '[data-tour="waypoint-panel"]',
    titleKey: "tour.registered.analysis.waypoints.title",
    descriptionKey: "tour.registered.analysis.waypoints.desc",
    placement: "top",
  },
  {
    id: "registered-segments",
    targetSelector: '[data-tour="segment-list"]',
    titleKey: "tour.shared.segments.title",
    descriptionKey: "tour.shared.segments.desc",
    placement: "top",
  },
  {
    id: "registered-pace",
    targetSelector: '[data-tour="pace-estimator"]',
    titleKey: "tour.registered.analysis.pace.title",
    descriptionKey: "tour.registered.analysis.pace.desc",
    placement: "top",
  },
  {
    id: "registered-weather",
    targetSelector: '[data-tour="weather-forecast"]',
    titleKey: "tour.registered.analysis.weather.title",
    descriptionKey: "tour.registered.analysis.weather.desc",
    placement: "top",
  },
]

export function getTourSteps(
  audience: TourAudience,
  phase: TourPhase
): TourStep[] {
  if (audience === "guest") {
    return phase === "empty" ? GUEST_EMPTY_STEPS : GUEST_ANALYSIS_STEPS
  }
  return phase === "empty" ? REGISTERED_EMPTY_STEPS : REGISTERED_ANALYSIS_STEPS
}
