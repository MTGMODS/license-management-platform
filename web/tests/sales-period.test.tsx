import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { beforeEach, expect, it, vi } from 'vitest'

import type { LicenseSaleRow, LicenseSalesStats } from '../src/shared/api/license'
import ru from '../src/i18n/locales/ru/vip.json'
import uk from '../src/i18n/locales/uk/vip.json'
import { SalesStats } from '../src/widgets/vip/SalesStats'

const state = vi.hoisted(() => ({ data: null as LicenseSalesStats | null, pie: vi.fn(), timeline: vi.fn() }))
vi.mock('@/features/license/useSalesStats', () => ({
  useSalesStats: () => ({ data: state.data, isPending: false, isError: false }),
}))
vi.mock('recharts', () => {
  const passthrough = ({ children }: { children: ReactNode }) => <>{children}</>
  const empty = () => null
  return {
    Area: empty, CartesianGrid: empty, Cell: empty, Tooltip: empty, XAxis: empty, YAxis: empty,
    AreaChart: ({ children, data }: { children: ReactNode; data: unknown[] }) => {
      state.timeline(data)
      return <svg>{children}</svg>
    },
    Pie: (props: object) => { state.pie(props); return null },
    PieChart: passthrough, ResponsiveContainer: passthrough,
  }
})

const i18n = createInstance()
await i18n.init({ lng: 'ru', defaultNS: 'vip', resources: { ru: { vip: ru }, uk: { vip: uk } },
  interpolation: { escapeValue: false } })

function sale(activated_at: string | null, amount: number, method: string, days: number,
  kind: LicenseSaleRow['purchase_kind']): LicenseSaleRow {
  return { activated_at, amount, method, duration_days: days, purchase_kind: kind,
    status: 'ACTIVE', purchased_at: null, expires_at: null }
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-18T12:00:00Z'))
  state.pie.mockClear()
  state.timeline.mockClear()
  state.data = {
    updated_at: '2026-10-18T12:00:00Z',
    subscriptions: {
      overview: { total_sold: 5, total_money: 27.5, active: 3, first_activated_at: null,
        last_activated_at: null, avg_check: 5.5, avg_subscriptions_per_buyer: 1.25, avg_revenue_per_buyer: 6.875 },
      // Deliberately different: filtered charts must use sale rows, not these all-time buckets.
      by_method: [{ method: 'OLD CACHE', count: 999, sum: 9999, count_share: 100, money_share: 100 }],
      by_duration: [{ days: 365, count: 999, sum: 9999, active: 999, count_share: 100, money_share: 100 }],
      retention: { buyers: 432, repeat_buyers: 15, repeat_rate: 3.47, avg_subscriptions_per_buyer: 1.25,
        avg_check: 5.5, avg_revenue_per_buyer: 6.875, by_purchases: [], tariff_transitions: [] },
      timeline: { daily: [{ date: '2026-10-16', count: 2, sum: 7 }],
        monthly: [{ month: '2026-10', count: 5, sum: 27.5 }] },
      sales: [sale('2026-10-15T23:59:59.999Z', 3, 'FunPay', 30, 'first'),
        sale('2026-10-16T00:00:00Z', 1, 'Stars', 7, 'repeat'),
        sale('2026-10-16T23:59:59.999Z', 6, 'FunPay', 90, 'repeat'),
        sale('2026-10-17T00:00:00Z', 15, 'PayPal', 365, 'first'),
        sale(null, 2.5, 'Crypto', 30, null)],
    },
  }
  await i18n.changeLanguage('ru')
})

function page() {
  return render(<I18nextProvider i18n={i18n}><SalesStats /></I18nextProvider>)
}
function chart(title: string) {
  return within(screen.getByRole('heading', { name: title }).parentElement!)
}
function pie(key: 'method' | 'days') {
  return state.pie.mock.calls.map(([props]) => props.data as Record<string, number | string>[])
    .findLast(data => data[0] && key in data[0])!
}
function metric(label: string, region = 'Итоги выбранного дня') {
  const summary = within(screen.getByRole('region', { name: region }))
  return within(summary.getByText(label).closest('div')!)
}

it('defaults to all time with one shared filter and matching chart/table totals', () => {
  page()
  expect((screen.getByRole('combobox', { name: 'Период' }) as HTMLSelectElement).value).toBe('all')
  expect(screen.getAllByRole('combobox', { name: 'Период' })).toHaveLength(1)
  expect(screen.queryByLabelText('День')).toBeNull()
  expect(metric('Продаж за всё время', 'Итоги за всё время').getByText('5')).toBeTruthy()
  expect(metric('Доход за всё время', 'Итоги за всё время').getByText('$27,50')).toBeTruthy()
  expect(screen.getAllByRole('row')).toHaveLength(6)
  expect(screen.getByRole('heading', { name: ru.stats.salesList.title_all })).toBeTruthy()
  expect(chart('Способы оплаты').getByText('$27,50')).toBeTruthy()
  expect(pie('method').reduce((sum, row) => sum + Number(row.sum), 0)).toBe(27.5)
  expect(pie('days').reduce((sum, row) => sum + Number(row.count), 0)).toBe(5)
  expect(screen.queryByText('OLD CACHE')).toBeNull()
  expect(screen.queryByText(/Активных:/)).toBeNull()
})

it('updates both charts, summaries and table for one UTC day without changing historical data', () => {
  page()
  const history = screen.getByRole('region', { name: ru.stats.historyTitle })
  const originalTimeline = state.timeline.mock.lastCall?.[0]
  const historyRenders = state.timeline.mock.calls.length
  fireEvent.change(screen.getByRole('combobox', { name: 'Период' }), { target: { value: 'day' } })
  fireEvent.change(screen.getByLabelText('День'), { target: { value: '2026-10-16' } })

  expect(metric('Продаж за день').getByText('2')).toBeTruthy()
  expect(metric('Доход за день').getByText('$7')).toBeTruthy()
  expect(metric('Повторные покупки').getByText('2')).toBeTruthy() // Kind remains global, not recalculated inside the day.
  expect(screen.getAllByRole('row')).toHaveLength(3)
  const payments = chart('Способы оплаты')
  expect(payments.getByText('$7')).toBeTruthy()
  expect(payments.getByText('85,7%')).toBeTruthy()
  expect(payments.getByText('PayPal')).toBeTruthy()
  expect(payments.getByText('Crypto')).toBeTruthy()
  expect(payments.getAllByText('$0')).toHaveLength(3)
  expect(screen.getByRole('heading', { name: ru.stats.salesList.title_day })).toBeTruthy()
  expect(pie('method')).toEqual([
    { method: 'FunPay', count: 1, sum: 6, count_share: 50, money_share: 85.7 },
    { method: 'Stars', count: 1, sum: 1, count_share: 50, money_share: 14.3 },
  ])
  expect(pie('days').map(row => row.days)).toEqual([7, 90])
  expect(screen.getByRole('region', { name: ru.stats.historyTitle })).toBe(history)
  expect(within(history).getByText('432')).toBeTruthy()
  expect(within(history).getByText(ru.stats.historySubtitle)).toBeTruthy()
  expect(state.timeline.mock.calls).toHaveLength(historyRenders)
  expect(state.timeline.mock.lastCall?.[0]).toBe(originalTimeline)
})

it('supports inclusive custom ranges and restores undated sales when returning to all time', () => {
  page()
  fireEvent.change(screen.getByRole('combobox', { name: 'Период' }), { target: { value: 'range' } })
  expect(screen.getByRole('heading', { name: ru.stats.salesList.title_range })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('с'), { target: { value: '2026-10-15' } })
  fireEvent.change(screen.getByLabelText('по'), { target: { value: '2026-10-16' } })
  expect(metric('Продаж за период', 'Итоги выбранного периода').getByText('3')).toBeTruthy()
  expect(metric('Доход за период', 'Итоги выбранного периода').getByText('$10')).toBeTruthy()
  expect(pie('days').map(row => row.days)).toEqual([7, 30, 90])
  fireEvent.change(screen.getByRole('combobox', { name: 'Период' }), { target: { value: 'all' } })
  expect(metric('Продаж за всё время', 'Итоги за всё время').getByText('5')).toBeTruthy()
  expect(chart('Способы оплаты').getByText('Crypto')).toBeTruthy()
  expect(screen.getAllByRole('row')).toHaveLength(6)
})

it('draws one full slice for a single category while keeping the complete zero legend', () => {
  page()
  fireEvent.change(screen.getByRole('combobox', { name: 'Период' }), { target: { value: 'day' } })
  fireEvent.change(screen.getByLabelText('День'), { target: { value: '17/10/2026' } })
  expect(pie('method').map(row => row.method)).toEqual(['PayPal'])
  expect(pie('days').map(row => row.days)).toEqual([365])
  expect(chart('Способы оплаты').getAllByRole('listitem')).toHaveLength(5)
  expect(chart('Продажи по тарифам').getAllByRole('listitem')).toHaveLength(4)
  for (const [props] of state.pie.mock.calls.slice(-2)) {
    expect(props.paddingAngle).toBe(0)
    expect(props.data).toHaveLength(1)
  }
})

it('shows empty-period charts and hides only filtered content for invalid or missing dates', () => {
  page()
  fireEvent.change(screen.getByRole('combobox', { name: 'Период' }), { target: { value: 'day' } })
  expect(screen.getByText(ru.stats.salesList.emptyFilter_day)).toBeTruthy()
  expect(chart('Способы оплаты').getAllByRole('listitem')).toHaveLength(5)
  expect(chart('Продажи по тарифам').getAllByRole('listitem')).toHaveLength(4)
  expect(chart('Способы оплаты').getAllByText('$0')).toHaveLength(6)
  expect(metric('Продаж за день').getByText('0')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('День'), { target: { value: '' } })
  expect(screen.getByRole('alert').textContent).toBe(ru.stats.salesList.chooseDay)
  expect(screen.queryByRole('region', { name: 'Итоги выбранного дня' })).toBeNull()
  expect(screen.queryByRole('heading', { name: 'Способы оплаты' })).toBeNull()
  expect(screen.getByRole('region', { name: ru.stats.historyTitle })).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: 'Период' }), { target: { value: 'range' } })
  fireEvent.change(screen.getByLabelText('с'), { target: { value: '2026-10-17' } })
  fireEvent.change(screen.getByLabelText('по'), { target: { value: '2026-10-15' } })
  expect(screen.getByRole('alert').textContent).toBe(ru.stats.salesList.invalidRange)
  expect(screen.queryByRole('table')).toBeNull()
})

it('provides the shared filter and the separate all-time section in Ukrainian', async () => {
  await i18n.changeLanguage('uk')
  page()
  expect((screen.getByRole('combobox', { name: uk.stats.salesList.range }) as HTMLSelectElement).value).toBe('all')
  expect(screen.getByRole('region', { name: uk.stats.historyTitle })).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: uk.stats.salesList.range }), { target: { value: 'day' } })
  expect(screen.getByRole('region', { name: uk.stats.salesList.results_day })).toBeTruthy()
  expect(screen.getByRole('heading', { name: uk.stats.salesList.title_day })).toBeTruthy()
})

it('shows dd/mm/yyyy, accepts typed dates and calendar selections, and rejects impossible dates', () => {
  const view = page()
  fireEvent.change(screen.getByRole('combobox', { name: 'Период' }), { target: { value: 'day' } })
  const input = screen.getByRole('textbox', { name: 'День' }) as HTMLInputElement
  expect(input.value).toBe('18/10/2026')
  expect(input.placeholder).toBe('dd/mm/yyyy')
  fireEvent.change(input, { target: { value: '16/10/2026' } })
  expect(metric('Продаж за день').getByText('2')).toBeTruthy()
  expect(input.value).toBe('16/10/2026')

  const calendar = view.container.querySelector('input[type="date"]') as HTMLInputElement
  const showPicker = vi.fn()
  calendar.showPicker = showPicker
  fireEvent.click(screen.getByRole('button', { name: 'Открыть календарь: День' }))
  expect(showPicker).toHaveBeenCalledOnce()
  fireEvent.change(calendar, { target: { value: '2026-10-17' } })
  expect(input.value).toBe('17/10/2026')
  expect(metric('Продаж за день').getByText('1')).toBeTruthy()

  for (const value of ['31/02/2026', '16/10/', '29/02/2026']) {
    fireEvent.change(input, { target: { value } })
    expect(screen.getByRole('alert').textContent).toBe(ru.stats.salesList.invalidDate)
    expect(screen.queryByRole('table')).toBeNull()
  }
  fireEvent.change(input, { target: { value: '29/02/2024' } })
  expect(screen.queryByRole('alert')).toBeNull()
})
