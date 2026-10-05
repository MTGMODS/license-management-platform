import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { RevenueTimeline } from '../src/widgets/vip/SalesStats'

const { axisSpy } = vi.hoisted(() => ({ axisSpy: vi.fn() }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

vi.mock('recharts', () => {
  const passthrough = ({ children }: { children: ReactNode }) => <>{children}</>
  const empty = () => null
  return {
    Area: empty,
    AreaChart: ({ children }: { children: ReactNode }) => <svg>{children}</svg>,
    CartesianGrid: empty,
    Cell: empty,
    Pie: empty,
    PieChart: passthrough,
    ResponsiveContainer: passthrough,
    Tooltip: empty,
    XAxis: (props: object) => {
      axisSpy(props)
      return null
    },
    YAxis: empty,
  }
})

function currentAxis() {
  return axisSpy.mock.lastCall?.[0] as {
    dataKey: string
    tickFormatter: (key: string) => string
  }
}

it('uses unique dates for tooltip lookup while keeping compact axis labels', () => {
  render(
    <RevenueTimeline
      monthly={[
        { month: '2025-09', count: 1, sum: 5 },
        { month: '2025-10', count: 2, sum: 10 },
        { month: '2026-01', count: 4, sum: 20 },
        { month: '2026-10', count: 3, sum: 15 },
      ]}
      daily={[
        { date: '2025-09-29', count: 1, sum: 5 },
        { date: '2026-09-29', count: 2, sum: 10 },
      ]}
    />,
  )

  expect(currentAxis().dataKey).toBe('key')
  expect(currentAxis().tickFormatter('2025-10')).toBe(currentAxis().tickFormatter('2026-10'))
  expect(currentAxis().tickFormatter('2026-10')).not.toBe('2026-10')

  fireEvent.click(screen.getByRole('button', { name: 'stats.timeline.daily' }))

  expect(currentAxis().dataKey).toBe('key')
  expect(currentAxis().tickFormatter('2025-09-29')).toBe(currentAxis().tickFormatter('2026-09-29'))
  expect(currentAxis().tickFormatter('2026-09-29')).not.toBe('2026-09-29')
})
