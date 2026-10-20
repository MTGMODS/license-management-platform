import { fireEvent, render, screen, within } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { renderToString } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'

import type { LicenseSaleRow } from '../src/shared/api/license'
import ru from '../src/i18n/locales/ru/vip.json'
import uk from '../src/i18n/locales/uk/vip.json'
import { RetentionBlock, SalesTable } from '../src/widgets/vip/SalesStats'

const i18n = createInstance()
await i18n.init({ lng: 'ru', fallbackLng: 'ru', defaultNS: 'vip',
  resources: { ru: { vip: ru }, uk: { vip: uk } }, interpolation: { escapeValue: false } })

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-18T12:00:00Z'))
  await i18n.changeLanguage('ru')
})

function row(activated_at: string, amount: number, purchase_kind: LicenseSaleRow['purchase_kind']): LicenseSaleRow {
  return { activated_at, amount, purchase_kind, method: 'Stars', duration_days: 30,
    status: 'ACTIVE', purchased_at: null, expires_at: null }
}
const sales = [
  row('2026-10-16T22:17:00Z', 6, 'repeat'),
  row('2026-10-16T00:00:00Z', 1.5, 'first'),
  row('2026-10-15T10:00:00Z', 3, 'first'),
  row('2026-10-17T00:00:00Z', 1, 'repeat'),
]

function renderTable(data = sales) {
  return render(<I18nextProvider i18n={i18n}><SalesTable sales={data} /></I18nextProvider>)
}

function results() { return within(screen.getByRole('region', { name: /^Итоги выбранного (дня|периода)$/ })) }

function metric(label: string) {
  const card = results().getByText(label).closest('div')!
  return within(card)
}

it('shows conspicuous zero totals for an empty day rather than a tiny count/sum line', () => {
  renderTable()
  expect(metric('Продаж за день').getByText('0')).toBeTruthy()
  expect(metric('Доход за день').getByText('$0')).toBeTruthy()
  expect(screen.getByText('За выбранный день продаж нет')).toBeTruthy()
  expect(results().queryByText(/Ранее:/)).toBeNull()
  expect(screen.queryByText('Как считаются показатели')).toBeNull()
  expect(screen.queryByRole('group', { name: 'Быстрый выбор периода' })).toBeNull()
  expect(screen.queryByText('18 октября 2026 г.')).toBeNull()
})

it('shows selected-day sales, exact revenue, purchase kinds and the previous UTC day', () => {
  renderTable()
  fireEvent.change(screen.getByLabelText('День'), { target: { value: '2026-10-16' } })
  expect(metric('Продаж за день').getByText('2')).toBeTruthy()
  expect(metric('Доход за день').getByText('$7,50')).toBeTruthy()
  expect(metric('Первые покупки').getByText('Доход: $1,50')).toBeTruthy()
  expect(metric('Повторные покупки').getByText('Доход: $6')).toBeTruthy()
  expect(results().getByText('Ранее: 1 · +100,0%')).toBeTruthy()
  expect(results().getByText('Ранее: $3 · +150,0%')).toBeTruthy()
  expect(screen.getAllByRole('row')).toHaveLength(3)
})

it('keeps custom periods and all-time results through the date inputs without preset buttons', () => {
  renderTable()
  expect(screen.queryByRole('button', { name: '7 дней' })).toBeNull()
  expect(screen.queryByRole('button', { name: '30 дней' })).toBeNull()
  expect(screen.queryByRole('button', { name: '90 дней' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'За всё время' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Период' }))
  fireEvent.change(screen.getByLabelText('с'), { target: { value: '2026-10-11' } })
  fireEvent.change(screen.getByLabelText('по'), { target: { value: '2026-10-17' } })
  expect(metric('Продаж за период').getByText('4')).toBeTruthy()
  expect(metric('Первые покупки').getByText('2')).toBeTruthy()
  expect(metric('Повторные покупки').getByText('2')).toBeTruthy()
  expect(results().getAllByText(/нет базы для сравнения/)).toHaveLength(2)
  expect(screen.queryByText(/Infinity|NaN/)).toBeNull()
  fireEvent.change(screen.getByLabelText('с'), { target: { value: '' } })
  fireEvent.change(screen.getByLabelText('по'), { target: { value: '' } })
  expect(screen.getByLabelText('с').getAttribute('value')).toBe('')
  expect(results().queryByText(/Ранее:/)).toBeNull()
})

it('supports custom and open-ended ranges and reports invalid ordering', () => {
  renderTable()
  fireEvent.click(screen.getByRole('button', { name: 'Период' }))
  fireEvent.change(screen.getByLabelText('с'), { target: { value: '2026-10-16' } })
  expect(metric('Продаж за период').getByText('3')).toBeTruthy()
  expect(results().queryByText(/Ранее:/)).toBeNull()
  fireEvent.change(screen.getByLabelText('по'), { target: { value: '2026-10-17' } })
  expect(results().getByText(/Сравнение с 14 октября 2026 г. — 15 октября 2026 г./)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('по'), { target: { value: '2026-10-15' } })
  expect(screen.getByRole('alert').textContent).toContain('Начало периода')
  expect(screen.queryByRole('region', { name: 'Итоги выбранного периода' })).toBeNull()
})

it('does not label rows from the older Redis payload as first purchases', () => {
  renderTable([row('2026-10-18T01:00:00Z', 3, null)])
  expect(metric('Продаж за день').getByText('1')).toBeTruthy()
  expect(results().queryByText('Первые покупки')).toBeNull()
  expect(results().getByText(/Нет данных для определения первой\/повторной покупки: 1/)).toBeTruthy()
})

it.each(['ru', 'uk'])('adds purchase type after the date using existing API values in %s', async (lng) => {
  await i18n.changeLanguage(lng)
  renderTable([
    row('2026-10-18T01:00:00Z', 3, 'first'),
    row('2026-10-18T02:00:00Z', 6, 'repeat'),
    row('2026-10-18T03:00:00Z', 1, null),
  ])
  const copy = (lng === 'ru' ? ru : uk).stats.salesList
  const table = within(screen.getByRole('table', { name: copy.title }))
  expect(table.getAllByRole('columnheader').map((header) => header.textContent))
    .toEqual([copy.status, copy.plan, copy.amount, copy.method, copy.date, copy.purchaseType])
  const rows = table.getAllByRole('row').slice(1)
  expect(rows.map((row) => within(row).getAllByRole('cell')[5]?.textContent))
    .toEqual(['—', copy.renewal, copy.newPurchase])
  expect(table.getByText(copy.newPurchase).className).toContain('text-accent-300')
  expect(table.getByText(copy.renewal).className).toContain('text-violet-300')
})

it('renders the period summary and filters in Ukrainian', async () => {
  await i18n.changeLanguage('uk')
  renderTable()
  expect(screen.getByRole('region', { name: 'Підсумки обраного дня' })).toBeTruthy()
  expect(screen.getByText('Продажів за день')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Період' })).toBeTruthy()
  expect(screen.queryByText('Як розраховуються показники')).toBeNull()
})

it.each(['ru', 'uk'])('switches summary and empty-state wording between day and period in %s', async (lng) => {
  await i18n.changeLanguage(lng)
  renderTable([])
  const copy = (lng === 'ru' ? ru : uk).stats.salesList
  function expectDay() {
    expect(screen.getByRole('region', { name: copy.results_day })).toBeTruthy()
    expect(screen.getByText(copy.selectedSales_day)).toBeTruthy()
    expect(screen.getByText(copy.selectedRevenue_day)).toBeTruthy()
    expect(screen.getByText(copy.emptyFilter_day)).toBeTruthy()
    expect(screen.queryByText(copy.emptyFilter)).toBeNull()
  }
  expectDay()
  fireEvent.click(screen.getByRole('button', { name: copy.period }))
  expect(screen.getByRole('region', { name: copy.results })).toBeTruthy()
  expect(screen.getByText(copy.selectedSales)).toBeTruthy()
  expect(screen.getByText(copy.selectedRevenue)).toBeTruthy()
  expect(screen.getByText(copy.emptyFilter)).toBeTruthy()
  expect(screen.queryByText(copy.selectedSales_day)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: copy.oneDay }))
  expectDay()
})

function manySales(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    ...row(new Date(Date.UTC(2026, 9, 17, 0, 0, i)).toISOString(), 1, i % 2 ? 'repeat' : 'first'),
    method: `sale-${i}`,
  }))
}

it('renders at most 50 sales while totals still include all 2664 filtered purchases', () => {
  renderTable(manySales(2664))
  fireEvent.click(screen.getByRole('button', { name: 'Период' }))
  expect(screen.getAllByRole('row')).toHaveLength(51)
  expect(metric('Продаж за период').getByText('2 664')).toBeTruthy()
  expect(metric('Доход за период').getByText('$2 664')).toBeTruthy()
  expect(metric('Первые покупки').getByText('1 332')).toBeTruthy()
  expect(metric('Повторные покупки').getByText('1 332')).toBeTruthy()
  expect(screen.getByText('sale-2663')).toBeTruthy()
  expect(screen.queryByText('sale-2613')).toBeNull()
  expect(screen.getByRole('button', { name: 'Назад' }).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
  expect(screen.getAllByRole('row')).toHaveLength(51)
  expect(screen.getByText('sale-2613')).toBeTruthy()
  expect(screen.queryByText('sale-2663')).toBeNull()
  expect(screen.getByText('Показано 51–100 из 2 664 продаж')).toBeTruthy()
  expect(metric('Продаж за период').getByText('2 664')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
  expect(screen.getByText('sale-2663')).toBeTruthy()
})

it('handles the last partial page and resets pagination when filters change', () => {
  renderTable(manySales(123))
  fireEvent.click(screen.getByRole('button', { name: 'Период' }))
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
  expect(screen.getAllByRole('row')).toHaveLength(24)
  expect(screen.getByText('Показано 101–123 из 123 продаж')).toBeTruthy()
  expect(screen.getByText('sale-0')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Далее' }).hasAttribute('disabled')).toBe(true)
  fireEvent.change(screen.getByLabelText('с'), { target: { value: '2026-10-18' } })
  expect(screen.queryByRole('table')).toBeNull()
  expect(screen.queryByRole('group', { name: 'Страницы списка продаж' })).toBeNull()
  fireEvent.change(screen.getByLabelText('с'), { target: { value: '' } })
  expect(screen.getByText('sale-122')).toBeTruthy()
  expect(screen.getByText('Показано 1–50 из 123 продаж')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'День' }))
  expect(screen.getByText('За выбранный день продаж нет')).toBeTruthy()
  expect(screen.queryByRole('group', { name: 'Страницы списка продаж' })).toBeNull()
})

it('clamps the visible page when refreshed sales data has fewer entries', () => {
  const view = renderTable(manySales(123))
  fireEvent.click(screen.getByRole('button', { name: 'Период' }))
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
  view.rerender(<I18nextProvider i18n={i18n}><SalesTable sales={manySales(3)} /></I18nextProvider>)
  expect(screen.getAllByRole('row')).toHaveLength(4)
  expect(screen.getByText('sale-2')).toBeTruthy()
  expect(metric('Продаж за период').getByText('3')).toBeTruthy()
  expect(screen.queryByRole('group', { name: 'Страницы списка продаж' })).toBeNull()
})

it('can show the table immediately with four animated placeholders before summary work', () => {
  const html = renderToString(<I18nextProvider i18n={i18n}><SalesTable sales={[
    row('2026-10-18T01:00:00Z', 3, 'first'),
  ]} /></I18nextProvider>)
  expect(html).toContain('aria-label="Подсчёт итогов продаж"')
  expect(html).toContain('<table')
  expect(html).not.toContain('aria-label="Итоги выбранного дня"')
  expect(html.match(/after:animate-shimmer/g)).toHaveLength(4)
})

it('shows tariff transition counts, shares and subsequent-purchase revenue', () => {
  render(<I18nextProvider i18n={i18n}><RetentionBlock retention={{
    buyers: 3, repeat_buyers: 2, repeat_rate: 66.7, avg_subscriptions_per_buyer: 2,
    avg_check: 3, avg_revenue_per_buyer: 6, by_purchases: [
      { purchases: 1, renewals: 0, users: 1, sum: 3, share: 33.3 },
      { purchases: 2, renewals: 1, users: 2, sum: 15, share: 66.7 },
    ],
    tariff_transitions: [{ from_days: 7, to_days: 30, count: 2, sum: 6, share: 100 }],
  }} /></I18nextProvider>)
  expect(screen.getByText('Какие тарифы покупают после предыдущего')).toBeTruthy()
  const group = within(screen.getByRole('region', { name: 'После тарифа на 7 дней' }))
  expect(group.getAllByRole('listitem')).toHaveLength(4)
  const transition = within(group.getAllByRole('listitem')[1]!)
  expect(transition.getByText('30 дней')).toBeTruthy()
  expect(transition.getByText('2 перехода')).toBeTruthy()
  expect(transition.getByText('100,0%')).toBeTruthy()
  expect(screen.getAllByRole('region', { name: /^После тарифа/ })).toHaveLength(4)
  expect(screen.getAllByText('0 переходов')).toHaveLength(15)
  expect(group.getByRole('list').className).toContain('lg:grid-cols-4')
  expect(screen.getByText('66,7%').className).toContain('text-violet-200')
  expect(screen.getByText('3', { selector: 'p' }).className).toContain('text-accent-300')
  expect(screen.getByText('1', { selector: 'span' }).className).toContain('text-accent-300')
  expect(screen.getByText('$15').className).toContain('text-emerald-400')
  expect(screen.getByText('$6').className).toContain('text-emerald-400')
  const hint = screen.getByText(ru.stats.retention.transitionsHint.replace('\n', ' '))
  expect(hint.textContent).toContain('за всё время.\nПроцент')
  expect(hint.className).toContain('whitespace-pre-line')
})

it('shows all sixteen transition combinations even when none have occurred, in Ukrainian too', async () => {
  await i18n.changeLanguage('uk')
  render(<I18nextProvider i18n={i18n}><RetentionBlock retention={{
    buyers: 0, repeat_buyers: 0, repeat_rate: 0, avg_subscriptions_per_buyer: 0,
    avg_check: 0, avg_revenue_per_buyer: 0, by_purchases: [], tariff_transitions: [],
  }} /></I18nextProvider>)
  const groups = screen.getAllByRole('region', { name: /^Після тарифу/ })
  expect(groups).toHaveLength(4)
  for (const group of groups) expect(within(group).getAllByRole('listitem')).toHaveLength(4)
  expect(screen.getAllByText('0 переходів')).toHaveLength(16)
  expect(screen.getAllByText('$0')).toHaveLength(16)
})
