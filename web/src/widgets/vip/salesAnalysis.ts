import type { LicenseDurationStat, LicensePaymentStat, LicenseSaleRow } from '@/shared/api/license'
import { utcCalendarDayKey } from '@/shared/lib/datetime'

export type SalesRange = { from: string; to: string }
export type SalesRangeMode = 'all' | 'day' | 'range'
export type SalesDurationBucket = Omit<LicenseDurationStat, 'active'>
const PAYMENT_METHODS = ['FunPay', 'Stars', 'Card', 'Crypto', 'PayPal']
const TARIFF_DAYS = [7, 30, 90, 365]

export function saleDate(row: LicenseSaleRow): string | null {
  return row.activated_at ?? row.purchased_at
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

/** Both charts use the same selected rows, not the unfiltered API aggregates. */
export function groupSales(rows: LicenseSaleRow[]): {
  payments: LicensePaymentStat[]
  durations: SalesDurationBucket[]
} {
  const methods = new Map<string, { method: string; count: number; cents: number }>()
  const tariffs = new Map<number, { days: number; count: number; cents: number }>()
  PAYMENT_METHODS.forEach(method => methods.set(method, { method, count: 0, cents: 0 }))
  TARIFF_DAYS.forEach(days => tariffs.set(days, { days, count: 0, cents: 0 }))
  let totalCents = 0
  for (const row of rows) {
    const cents = Math.round(row.amount * 100)
    totalCents += cents
    const method = methods.get(row.method) ?? { method: row.method, count: 0, cents: 0 }
    method.count += 1
    method.cents += cents
    methods.set(row.method, method)
    if (row.duration_days != null) {
      const tariff = tariffs.get(row.duration_days) ?? { days: row.duration_days, count: 0, cents: 0 }
      tariff.count += 1
      tariff.cents += cents
      tariffs.set(row.duration_days, tariff)
    }
  }
  const share = (value: number, total: number) => total > 0 ? Math.round(value / total * 1000) / 10 : 0
  const bucket = ({ count, cents }: { count: number; cents: number }) => ({
    count, sum: cents / 100,
    count_share: share(count, rows.length), money_share: share(cents, totalCents),
  })
  return {
    payments: [...methods.values()]
      .map(item => ({ method: item.method, ...bucket(item) })),
    durations: [...tariffs.values()].sort((a, b) => a.days - b.days)
      .map(item => ({ days: item.days, ...bucket(item) })),
  }
}
