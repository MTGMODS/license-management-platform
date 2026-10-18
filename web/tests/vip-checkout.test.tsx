import { fireEvent, render, screen, within } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'

import ru from '../src/i18n/locales/ru/vip.json'
import uk from '../src/i18n/locales/uk/vip.json'
import { VipPage } from '../src/pages/vip/VipPage'
import { PricingGrid } from '../src/widgets/vip/PricingGrid'

const plans = [
  { duration_days: 7, price: 1, max_devices: 1, reset_limit: 0, telegram_stars_price: 60 },
  { duration_days: 30, price: 3, max_devices: 2, reset_limit: 0, telegram_stars_price: 180 },
  { duration_days: 90, price: 6, max_devices: 2, reset_limit: 1, telegram_stars_price: 360 },
  { duration_days: 365, price: 15, max_devices: 2, reset_limit: 2, telegram_stars_price: 900 },
]

vi.mock('@/features/license/useTariffs', () => ({
  useTariffs: () => ({ data: { currency: 'USD', plans }, isPending: false, isError: false }),
}))
vi.mock('@/features/license/useSalesStats', () => ({
  useSalesStats: () => ({ isError: false }),
}))
vi.mock('@/features/geo/useLocalUsdPrice', () => ({
  useLocalUsdPrice: () => ({ ready: true, formatApprox: (usd: number) => ({ text: `${usd * 45}₴` }) }),
}))
vi.mock('@/widgets/vip/SalesOverview', () => ({ SalesOverview: () => null }))
vi.mock('@/shared/ui', async (original) => ({
  ...await original<typeof import('../src/shared/ui')>(), DeferredMount: () => null,
}))

const i18n = createInstance()
await i18n.init({ lng: 'ru', defaultNS: 'vip', resources: { ru: { vip: ru }, uk: { vip: uk } },
  interpolation: { escapeValue: false } })

beforeEach(async () => {
  await i18n.changeLanguage('ru')
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
})

function page() {
  return render(<I18nextProvider i18n={i18n}><MemoryRouter><VipPage /></MemoryRouter></I18nextProvider>)
}

it('keeps USD prominent and uses a smaller muted local currency equivalent', () => {
  render(<I18nextProvider i18n={i18n}><PricingGrid /></I18nextProvider>)
  const usd = screen.getByText('$3', { selector: 'p' })
  const local = screen.getByText('≈ 135 ₴', { selector: 'p' })
  expect(usd.className).toContain('text-2xl')
  expect(local.className).toContain('text-base')
  expect(local.className).toContain('text-fg-subtle')
})

it('explains HWID on hover, keyboard focus and tap without selecting a different tariff', () => {
  const choose = vi.fn()
  render(<I18nextProvider i18n={i18n}><PricingGrid selectedDays={30} onChoose={choose} /></I18nextProvider>)
  const help = screen.getAllByRole('button', { name: 'Что такое сброс HWID?' })[2]!
  fireEvent.mouseEnter(help.parentElement!)
  expect(screen.getByRole('tooltip').textContent).toContain('бесплатных сбросов')
  fireEvent.mouseLeave(help.parentElement!)
  expect(screen.queryByRole('tooltip')).toBeNull()
  fireEvent.focus(help)
  expect(help.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id)
  fireEvent.keyDown(help, { key: 'Escape' })
  expect(screen.queryByRole('tooltip')).toBeNull()
  fireEvent.click(help)
  expect(screen.getByRole('tooltip').textContent).toContain('При смене ПК или телефона')
  expect(choose).not.toHaveBeenCalled()
  fireEvent.blur(help)
  expect(screen.queryByRole('tooltip')).toBeNull()
  fireEvent.click(screen.getByRole('radio', { name: '90 дней' }))
  expect(choose).toHaveBeenCalledWith(90)
})

it('shows Free as a quiet text link beneath the purchase button', () => {
  page()
  const buy = screen.getByRole('button', { name: 'Приобрести на 30 дней за $3' })
  const free = screen.getByRole('link', { name: 'Вернуться к Free версии' })
  expect(free.getAttribute('href')).toBe('/helper')
  expect(free.className).not.toMatch(/bg-|border|h-13/)
  expect(buy.parentElement?.className).toContain('flex-col')
  expect(buy.parentElement?.className).not.toContain('lg:flex-row')
  expect(within(buy.parentElement!).getByRole('link')).toBe(free)
})
