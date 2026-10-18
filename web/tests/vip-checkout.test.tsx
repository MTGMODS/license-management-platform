import { fireEvent, render, screen, within } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'

import ru from '../src/i18n/locales/ru/vip.json'
import uk from '../src/i18n/locales/uk/vip.json'
import { VipPage } from '../src/pages/vip/VipPage'
import { PricingGrid } from '../src/widgets/vip/PricingGrid'
import { PaymentSection } from '../src/widgets/vip/PaymentSection'

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

it('keeps the selected plan highlighted in FunPay after the purchase CTA scrolls', () => {
  page()
  expect(screen.getByRole('link', { name: '30 дней' }).getAttribute('aria-current')).toBe('true')
  fireEvent.click(screen.getAllByRole('radio', { name: '90 дней' })[0]!)
  const selected = screen.getByRole('link', { name: '90 дней' })
  expect(selected.getAttribute('aria-current')).toBe('true')
  expect(selected.className).toContain('bg-accent-500 text-white')
  expect(selected.getAttribute('href')).toBe('https://funpay.com/lots/offer?id=53392702')
  expect(screen.getByRole('link', { name: '30 дней' }).getAttribute('aria-current')).toBeNull()
  const payment = document.getElementById('vip-payment')!
  const scroll = vi.fn()
  payment.scrollIntoView = scroll
  fireEvent.click(screen.getByRole('button', { name: 'Приобрести на 90 дней за $6' }))
  expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  expect(selected.getAttribute('aria-current')).toBe('true')
})

it('preserves the selection across Telegram Stars, card-to-Stars and Fragment routes', () => {
  page()
  fireEvent.click(screen.getAllByRole('radio', { name: '90 дней' })[0]!)
  fireEvent.click(screen.getByRole('button', { name: /^Картой через Telegram \(Stars\)/ }))
  expect(screen.getByText('360 ⭐').parentElement?.getAttribute('aria-current')).toBe('true')
  expect(screen.getByText('180 ⭐').parentElement?.getAttribute('aria-current')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /^Криптовалюта/ }))
  expect(screen.getByText('360 ⭐').parentElement?.getAttribute('aria-current')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: /^Звёзды Telegram/ }))
  expect(screen.getByText('360 ⭐').parentElement?.getAttribute('aria-current')).toBe('true')
  fireEvent.click(screen.getAllByRole('radio', { name: '365 дней' })[0]!)
  expect(screen.getByText('900 ⭐').parentElement?.getAttribute('aria-current')).toBe('true')
  expect(screen.getByText('360 ⭐').parentElement?.getAttribute('aria-current')).toBeNull()
})

it('puts the selected USD amount into PayPal instructions and updates it with the upper plan', () => {
  page()
  fireEvent.click(screen.getByRole('button', { name: /^PayPal/ }))
  expect(screen.getByText('$3', { selector: 'strong' }).parentElement?.textContent).toMatch(/^Переведите \$3 на счёт PayPal\./)
  fireEvent.click(screen.getAllByRole('radio', { name: '90 дней' })[0]!)
  expect(screen.getByText('$6', { selector: 'strong' }).className).toContain('font-semibold')
  fireEvent.click(screen.getAllByRole('radio', { name: '7 дней' })[0]!)
  expect(screen.getByText('$1', { selector: 'strong' }).parentElement?.textContent).toMatch(/^Переведите \$1 на счёт PayPal\./)
})

it('keeps cents and localizes the PayPal amount in Ukrainian', async () => {
  await i18n.changeLanguage('uk')
  render(<I18nextProvider i18n={i18n}><MemoryRouter>
    <PaymentSection selectedPlan={{ ...plans[1]!, price: 2.49 }} />
  </MemoryRouter></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: /^PayPal/ }))
  expect(screen.getByText('$2,49', { selector: 'strong' }).parentElement?.textContent).toMatch(/^Перекажіть \$2,49 на рахунок PayPal\./)
})

it('shows neutral informational platform fees instead of warning emoji', () => {
  page()
  function fee(percent: number) {
    const badge = screen.getByText(`Комиссия площадки ≈ ${percent}%`)
    expect(badge.className).toContain('bg-ink-800')
    expect(badge.className).not.toContain('caution')
    expect(badge.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(badge.textContent).not.toContain('⚠')
  }
  fee(30)
  fireEvent.click(screen.getByRole('button', { name: /^Картой через Telegram \(Stars\)/ }))
  fee(40)
  fireEvent.click(screen.getByRole('button', { name: /^Криптовалюта/ }))
  fee(20)
})

it('marks direct crypto transfers with green no-fee badges in the picker and details', () => {
  page()
  fireEvent.click(screen.getByRole('button', { name: /^Криптовалюта/ }))
  const direct = screen.getByRole('button', { name: /^Прямой перевод криптовалюты/ })
  expect(within(direct).getByText('Без комиссии').className).toContain('text-positive')
  fireEvent.click(direct)
  expect(screen.getAllByText('Без комиссии')).toHaveLength(2)
  for (const badge of screen.getAllByText('Без комиссии')) {
    expect(badge.className).toContain('bg-positive/10')
  }
  expect(screen.queryByText(/Комиссия площадки/)).toBeNull()
})
