import { expect, it } from 'vitest'

import type { LicenseSaleRow } from '../src/shared/api/license'
import { filterSales, previousRange, shiftDay, summarizeSales } from '../src/widgets/vip/salesAnalysis'

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

it('compares exactly equal closed periods across year and leap-day boundaries', () => {
  expect(previousRange({ from: '2026-01-01', to: '2026-01-07' }, '2026-10-18'))
    .toEqual({ from: '2025-12-25', to: '2025-12-31' })
  expect(previousRange({ from: '2024-03-01', to: '2024-03-01' }, '2026-10-18'))
    .toEqual({ from: '2024-02-29', to: '2024-02-29' })
  expect(shiftDay('2026-03-29', 1)).toBe('2026-03-30') // UTC days, unaffected by DST.
})

it.each([
  { from: '', to: '' }, { from: '2026-10-01', to: '' },
  { from: '', to: '2026-10-01' }, { from: '2026-10-19', to: '2026-10-18' },
  { from: '2026-10-18', to: '2026-10-18' }, { from: '2026-10-18', to: '2026-10-19' },
])('does not compare unbounded, reversed, ongoing or future periods: %j', (range) => {
  expect(previousRange(range, '2026-10-18')).toBeNull()
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
