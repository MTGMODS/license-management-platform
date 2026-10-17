import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { QuickStats } from '../src/widgets/stats/QuickStats'

const state = vi.hoisted(() => ({ conversion: 2.49 }))

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
        metrics: { vip_conversion: state.conversion, pc_ratio: 82, mobile_ratio: 18 },
      },
    },
  }),
}))

it.each([[2.49, '2,49%'], [2.5, '2,50%']])(
  'shows VIP conversion %s with two decimal places without changing device percentages',
  (conversion, expected) => {
    state.conversion = conversion
    render(<QuickStats />)
    const count = new Intl.NumberFormat('ru', { maximumFractionDigits: 0 }).format(1209)
    expect(screen.getByText(`${count} (${expected})`, { normalizer: (text) => text })).toBeTruthy()
    expect(screen.getByText('82,0% / 18,0%')).toBeTruthy()
  },
)
