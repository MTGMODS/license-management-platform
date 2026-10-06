import type { useFormatters } from '@/shared/lib/format'

export function usd(format: ReturnType<typeof useFormatters>, value: number): string {
  return `$${format.money(value)}`
}

export function usdWhole(format: ReturnType<typeof useFormatters>, value: number): string {
  return `$${format.number(value)}`
}
