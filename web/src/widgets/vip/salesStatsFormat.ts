import type { useFormatters } from '@/shared/lib/format'

export function usd(format: ReturnType<typeof useFormatters>, value: number): string {
  return `$${format.money(value)}`
}

export function usdWhole(format: ReturnType<typeof useFormatters>, value: number): string {
  return `$${format.number(value)}`
}

/** Preserve actual cents without adding decimals to whole-dollar prices. */
export function usdAmount(format: ReturnType<typeof useFormatters>, value: number): string {
  return Number.isInteger(value) ? usdWhole(format, value) : usd(format, value)
}
