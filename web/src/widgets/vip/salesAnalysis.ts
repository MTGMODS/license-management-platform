import type { LicenseSaleRow } from '@/shared/api/license'
import { utcCalendarDayKey } from '@/shared/lib/datetime'

export type SalesRange = { from: string; to: string }
const DAY_MS = 86_400_000

export function saleDate(row: LicenseSaleRow): string | null {
  return row.activated_at ?? row.purchased_at
}

export function shiftDay(day: string, offset: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10)
}

export function filterSales(sales: LicenseSaleRow[], range: SalesRange): LicenseSaleRow[] {
  if (!range.from && !range.to) return sales
  return sales.filter((row) => {
    const when = saleDate(row)
    if (!when) return false
    const key = utcCalendarDayKey(when)
    return (!range.from || key >= range.from) && (!range.to || key <= range.to)
  })
}

/** Compare only closed, bounded UTC periods; a partial day is not a full day. */
export function previousRange(range: SalesRange, today: string): SalesRange | null {
  if (!range.from || !range.to || range.from > range.to || range.to >= today) return null
  const days = (Date.parse(range.to) - Date.parse(range.from)) / DAY_MS + 1
  return { from: shiftDay(range.from, -days), to: shiftDay(range.from, -1) }
}

export function summarizeSales(rows: LicenseSaleRow[]) {
  const summary = {
    count: rows.length, sum: 0,
    first: { count: 0, sum: 0 }, repeat: { count: 0, sum: 0 }, unknown: 0,
  }
  for (const row of rows) {
    summary.sum += row.amount
    if (row.purchase_kind === 'first' || row.purchase_kind === 'repeat') {
      summary[row.purchase_kind].count += 1
      summary[row.purchase_kind].sum += row.amount
    } else {
      summary.unknown += 1
    }
  }
  summary.sum = Math.round(summary.sum * 100) / 100
  summary.first.sum = Math.round(summary.first.sum * 100) / 100
  summary.repeat.sum = Math.round(summary.repeat.sum * 100) / 100
  return summary
}
