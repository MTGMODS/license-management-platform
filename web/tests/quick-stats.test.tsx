import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { QuickStats } from '../src/widgets/stats/QuickStats'

const state = vi.hoisted(() => ({ conversion: 2.49, pc: 82, mobile: 18 }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))
vi.mock('@/features/usage/usePublicStats', () => ({
  usePublicStats: () => ({
    isPending: false,
    isError: false,
    data: {
      updated_at: '2026-10-17T12:00:00Z',
      overview: {
        users: { total: { all_time: 48554 }, vip: { all_time: 1209 } },
        launches: { all_time: 100000 },
        metrics: { vip_conversion: state.conversion, pc_ratio: state.pc, mobile_ratio: state.mobile },
      },
    },
  }),
}))

it.each([[2.49, '2,49%'], [2.5, '2,50%']])(
  'shows VIP conversion %s and device percentages with two decimal places',
  (conversion, expected) => {
    state.conversion = conversion
    state.pc = 82
    state.mobile = 18
    render(<QuickStats />)
    const count = new Intl.NumberFormat('ru', { maximumFractionDigits: 0 }).format(1209)
    expect(screen.getByText(`${count} (${expected})`, { normalizer: (text) => text })).toBeTruthy()
    expect(screen.getByText('82,00% / 18,00%')).toBeTruthy()
  },
)

it('preserves the second decimal digit of PC and mobile percentages from the API', () => {
  state.pc = 81.98
  state.mobile = 18.02
  render(<QuickStats />)
  expect(screen.getByText('81,98% / 18,02%')).toBeTruthy()
})
