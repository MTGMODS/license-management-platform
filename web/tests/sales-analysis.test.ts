import { expect, it } from 'vitest'

import type { LicenseSaleRow } from '../src/shared/api/license'
import { filterSales, groupSales, summarizeSales } from '../src/widgets/vip/salesAnalysis'

function sale(overrides: Partial<LicenseSaleRow> = {}): LicenseSaleRow {
  return {
    amount: 1, method: 'Stars', duration_days: 7, status: 'ACTIVE',
    activated_at: '2026-10-16T22:17:00Z', purchased_at: null, expires_at: null,
    purchase_kind: 'first', ...overrides,
  }
}

it('filters inclusively by UTC rather than the local purchase date', () => {
  const rows = [sale(), sale({ activated_at: '2026-10-17T00:00:00Z' }),
    sale({ activated_at: null, purchased_at: '2026-10-16T00:00:00Z' }),
    sale({ activated_at: null })]
  expect(filterSales(rows, { from: '2026-10-16', to: '2026-10-16' })).toEqual([rows[0], rows[2]])
  expect(filterSales(rows, { from: '', to: '' })).toHaveLength(4)
  expect(filterSales(rows, { from: '2026-10-17', to: '' })).toEqual([rows[1]])
  expect(filterSales(rows, { from: '', to: '2026-10-16' })).toEqual([rows[0], rows[2]])
  expect(filterSales(rows, { from: '2026-10-17', to: '2026-10-16' })).toEqual([])
})

it('keeps cents, separates purchase kinds, and does not classify old cache rows as first', () => {
  expect(summarizeSales([
    sale({ amount: 0.1 }), sale({ amount: 0.2 }),
    sale({ amount: 2.45, purchase_kind: 'repeat' }),
    sale({ amount: 5, purchase_kind: null }),
  ])).toEqual({ count: 4, sum: 7.75, first: { count: 2, sum: 0.3 },
    repeat: { count: 1, sum: 2.45 }, unknown: 1 })
  expect(summarizeSales([]).sum).toBe(0)
})

it('groups the same selected sales by payment method and tariff, preserving cents and period shares', () => {
  const data = [sale({ amount: 0.1 }), sale({ amount: 0.2 }),
    sale({ amount: 2.45, method: 'FunPay', duration_days: 30 }),
    sale({ amount: 100, method: 'PayPal', duration_days: 365, activated_at: '2026-10-17T00:00:00Z' })]
  const result = groupSales(filterSales(data, { from: '2026-10-16', to: '2026-10-16' }))
  expect(result.payments.filter(item => item.count > 0)).toEqual([
    { method: 'FunPay', count: 1, sum: 2.45, count_share: 33.3, money_share: 89.1 },
    { method: 'Stars', count: 2, sum: 0.3, count_share: 66.7, money_share: 10.9 },
  ])
  expect(result.durations.filter(item => item.count > 0)).toEqual([
    { days: 7, count: 2, sum: 0.3, count_share: 66.7, money_share: 10.9 },
    { days: 30, count: 1, sum: 2.45, count_share: 33.3, money_share: 89.1 },
  ])
  expect(data).toHaveLength(4)
})

it('keeps every standard legend bucket at zero for an empty period without NaN or Infinity', () => {
  const empty = groupSales([])
  expect(empty.payments.map(item => item.method)).toEqual(['FunPay', 'Stars', 'Card', 'Crypto', 'PayPal'])
  expect(empty.durations.map(item => item.days)).toEqual([7, 30, 90, 365])
  for (const item of [...empty.payments, ...empty.durations]) {
    expect(item).toMatchObject({ count: 0, sum: 0, count_share: 0, money_share: 0 })
  }
  const result = groupSales([sale({ amount: 0 })])
  expect(result.payments[0]?.money_share).toBe(0)
  expect(result.durations[0]?.money_share).toBe(0)
})
