import { fireEvent, render, screen, within } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
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

function results() { return within(screen.getByRole('region', { name: 'Итоги выбранного периода' })) }

function metric(label: string) {
  const card = results().getByText(label).closest('div')!
  return within(card)
}

it('shows conspicuous zero totals for an empty day rather than a tiny count/sum line', () => {
  renderTable()
  expect(metric('Продаж за период').getByText('0')).toBeTruthy()
  expect(metric('Доход за период').getByText('$0')).toBeTruthy()
  expect(screen.getByText('За выбранный период продаж нет')).toBeTruthy()
  expect(results().queryByText(/Ранее:/)).toBeNull()
})

it('shows selected-day sales, exact revenue, purchase kinds and the previous UTC day', () => {
  renderTable()
  fireEvent.change(screen.getByLabelText('День'), { target: { value: '2026-10-16' } })
  expect(metric('Продаж за период').getByText('2')).toBeTruthy()
  expect(metric('Доход за период').getByText('$7,50')).toBeTruthy()
  expect(metric('Первые покупки').getByText('Доход: $1,50')).toBeTruthy()
  expect(metric('Повторные покупки').getByText('Доход: $6')).toBeTruthy()
  expect(results().getByText('Ранее: 1 · +100,0%')).toBeTruthy()
  expect(results().getByText('Ранее: $3 · +150,0%')).toBeTruthy()
  expect(screen.getAllByRole('row')).toHaveLength(3)
})

it('offers complete 7/30/90-day ranges and an all-time view without changing purchase kinds', () => {
  renderTable()
  fireEvent.click(screen.getByRole('button', { name: '7 дней' }))
  expect(screen.getByLabelText('с').getAttribute('value')).toBe('2026-10-11')
  expect(screen.getByLabelText('по').getAttribute('value')).toBe('2026-10-17')
  expect(metric('Продаж за период').getByText('4')).toBeTruthy()
  expect(metric('Первые покупки').getByText('2')).toBeTruthy()
  expect(metric('Повторные покупки').getByText('2')).toBeTruthy()
  expect(results().getAllByText(/нет базы для сравнения/)).toHaveLength(2)
  expect(screen.queryByText(/Infinity|NaN/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '30 дней' }))
  expect(screen.getByLabelText('с').getAttribute('value')).toBe('2026-09-18')
  fireEvent.click(screen.getByRole('button', { name: '90 дней' }))
  expect(screen.getByLabelText('с').getAttribute('value')).toBe('2026-07-20')
  fireEvent.click(screen.getByRole('button', { name: 'За всё время' }))
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
  expect(metric('Продаж за период').getByText('1')).toBeTruthy()
  expect(results().queryByText('Первые покупки')).toBeNull()
  expect(results().getByText(/Нет данных для определения первой\/повторной покупки: 1/)).toBeTruthy()
})

it('renders the period summary and filters in Ukrainian', async () => {
  await i18n.changeLanguage('uk')
  renderTable()
  expect(screen.getByRole('region', { name: 'Підсумки обраного періоду' })).toBeTruthy()
  expect(screen.getByText('Продажів за період')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'За весь час' })).toBeTruthy()
})

it('shows tariff transition counts, shares and subsequent-purchase revenue', () => {
  render(<I18nextProvider i18n={i18n}><RetentionBlock retention={{
    buyers: 3, repeat_buyers: 2, repeat_rate: 66.7, avg_subscriptions_per_buyer: 2,
    avg_check: 3, avg_revenue_per_buyer: 6, by_purchases: [],
    tariff_transitions: [{ from_days: 7, to_days: 30, count: 2, sum: 6, share: 100 }],
  }} /></I18nextProvider>)
  expect(screen.getByText('Какие тарифы покупают после предыдущего')).toBeTruthy()
  expect(screen.getByText('7 дней30 дней')).toBeTruthy()
  expect(screen.getByText('2 перехода · 100,0% · $6')).toBeTruthy()
})
