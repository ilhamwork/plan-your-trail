/**
 * Shared formatting utilities for trail distances, elevations, and numbers.
 */

export function formatKm(meters: number, digits: number = 1): string {
  return (meters / 1000).toFixed(digits)
}

export function formatKmLabel(meters: number, digits: number = 1): string {
  return `${formatKm(meters, digits)} km`
}

export function formatElevation(meters: number): string {
  return `${Math.round(meters)}m`
}

export function formatElevationLabel(meters: number): string {
  return `${Math.round(meters)} m`
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("id-ID")
}

export { formatRupiah } from "./invoice/totals"
