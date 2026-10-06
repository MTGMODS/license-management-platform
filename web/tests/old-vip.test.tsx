import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Link, MemoryRouter, Outlet } from 'react-router'
import { expect, it, vi } from 'vitest'

import { AppRoutes } from '../src/app/router'
import { usePageMeta } from '../src/app/usePageMeta'
import { request } from '../src/shared/api/http'
import { SalesStats } from '../src/widgets/vip/SalesStats'
import { ForeverStats } from '../src/widgets/vip/ForeverStats'

vi.mock('../src/shared/api/http', () => ({ request: vi.fn() }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { time?: string }) =>
      key === 'stats.updated' ? `${key}: ${values?.time}` : key,
    i18n: { language: 'ru' },
  }),
}))
vi.mock('@/pages/vip/VipPage', () => ({ VipPage: () => <div>Current VIP page</div> }))
vi.mock('@/app/AppLayout', () => ({
  AppLayout: () => {
    usePageMeta()
    return <>
      <Link to="/vip">Current</Link>
      <Link to="/old_vip">Archive</Link>
      <Outlet />
    </>
  },
}))
vi.mock('recharts', () => {
  const passthrough = ({ children }: { children: ReactNode }) => <>{children}</>
  const empty = () => null
  return {
    Area: empty, AreaChart: passthrough, CartesianGrid: empty, Cell: empty,
    Pie: empty, PieChart: passthrough, ResponsiveContainer: passthrough,
    Tooltip: empty, XAxis: empty, YAxis: empty,
  }
})

const archive = { updated_at: '2026-10-06T12:00:00Z', forever: {
  overview: { paid_sold: 2, total_money: 30, avg_check: 15 },
  by_method: [{ method: 'Steam', count: 2, sum: 30, money_share: 100, count_share: 100 }],
  by_price: [{ price: 15, count: 2, sum: 30, count_share: 100, money_share: 100 }],
} }

it('opens the archive anonymously with noindex and reuses fresh data on return', async () => {
  vi.mocked(request).mockClear()
  vi.mocked(request).mockResolvedValue(archive)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}>
    <MemoryRouter initialEntries={['/old_vip']}><AppRoutes /></MemoryRouter>
  </QueryClientProvider>)

  expect(await screen.findByText('Steam')).toBeTruthy()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('stats.legacy.title')
  expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow')
  expect(document.title).toBe('tab.oldVip')
  expect(request).toHaveBeenCalledTimes(1)
  expect(request).toHaveBeenCalledWith(expect.objectContaining({ path: '/stats/old' }))
  expect(screen.queryByText('stats.detailsTitle')).toBeNull()
  expect(screen.getByRole('heading', { name: 'stats.legacy.overviewTitle' })).toBeTruthy()
  const updated = new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(archive.updated_at))
  expect(screen.getByText(`stats.updated: ${updated}`)).toBeTruthy()
  expect(screen.queryByText('stats.legacy.paymentsHint')).toBeNull()

  fireEvent.click(screen.getByRole('link', { name: 'Current' }))
  expect(await screen.findByText('Current VIP page')).toBeTruthy()
  expect(client.getQueryData(['license', 'old-sales-stats'])).toBeTruthy()
  expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index,follow')

  vi.mocked(request).mockResolvedValue({ updated_at: archive.updated_at, forever: { ...archive.forever,
    by_method: [{ method: 'Card', count: 2, sum: 30, money_share: 100 }],
  } })
  fireEvent.click(screen.getByRole('link', { name: 'Archive' }))
  expect(await screen.findByText('Steam')).toBeTruthy()
  expect(request).toHaveBeenCalledTimes(1)

  await act(async () => {
    await client.invalidateQueries({ queryKey: ['license', 'old-sales-stats'] })
  })
  expect(await screen.findByText('Card')).toBeTruthy()
  expect(screen.queryByText('Steam')).toBeNull()
  expect(request).toHaveBeenCalledTimes(2)
})

it('combines known price periods with actual sales without dropping unlisted prices', () => {
  const { container } = render(<ForeverStats data={{ ...archive, forever: {
    ...archive.forever,
    by_price: [{ price: 20, count: 2, sum: 40, count_share: 100, money_share: 100 }],
  } }} />)

  expect(screen.getByRole('heading', { name: 'stats.legacy.byPrice.title' })).toBeTruthy()
  expect(screen.getByText('stats.legacy.priceHistory.unknownPeriod')).toBeTruthy()
  expect(screen.getByText('$20')).toBeTruthy()
  expect(container.querySelectorAll('time')).toHaveLength(14)
  expect(container.querySelector('time')?.dateTime).toBe('2024-04-01')
  expect(container.querySelectorAll('time')[13]?.dateTime).toBe('2026-03-01')
})

it('renders only subscription analytics even if an old response contains lifetime data', async () => {
  vi.mocked(request).mockClear()
  vi.mocked(request).mockResolvedValue({ ...archive,
    updated_at: '2026-10-06T12:00:00Z', subscriptions: {},
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><SalesStats /></QueryClientProvider>)
  await waitFor(() => expect(client.getQueryData(['license', 'sales-stats'])).toBeTruthy())

  expect(screen.getByText('stats.detailsTitle')).toBeTruthy()
  expect(screen.queryByText('stats.legacy.title')).toBeNull()
  expect(screen.queryByText('Steam')).toBeNull()
  expect(request).toHaveBeenCalledTimes(1)
  expect(request).toHaveBeenCalledWith(expect.objectContaining({ path: '/stats/public' }))
})
