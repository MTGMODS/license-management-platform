import { render, screen, within } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { expect, it } from 'vitest'

import ru from '../src/i18n/locales/ru/vip.json'
import uk from '../src/i18n/locales/uk/vip.json'
import { VipBenefits } from '../src/widgets/vip/VipBenefits'

it.each([
  ['ru', 'Преимущества платной версии', 'Отключение рекламы на Mobile', 'Смотреть видеообзор'],
  ['uk', 'Переваги платної версії', 'Вимкнення реклами на Mobile', 'Дивитися відеоогляд'],
])('renders five individual benefits with a featured video link in %s', async (lng, title, ads, watch) => {
  const i18n = createInstance()
  await i18n.init({ lng, defaultNS: 'vip', resources: { ru: { vip: ru }, uk: { vip: uk } } })
  render(<I18nextProvider i18n={i18n}><MemoryRouter><VipBenefits /></MemoryRouter></I18nextProvider>)
  const section = screen.getByRole('region', { name: title })
  const items = within(section).getAllByRole('listitem')
  expect(items).toHaveLength(5)
  expect(within(section).getAllByRole('heading', { level: 3 })).toHaveLength(5)
  expect(within(items[2]!).getByRole('heading', { name: ads })).toBeTruthy()
  expect(within(items[2]!).getByText(lng === 'ru'
    ? 'Блокировка встроенной рекламы в лаунчере'
    : 'Блокування вбудованої реклами в лаунчері')).toBeTruthy()
  const video = within(section).getByRole('link', { name: watch })
  expect(video.getAttribute('href')).toBe('/helper')
  expect(items[0]!.contains(video)).toBe(true)
  expect(items[0]!.className).toContain('lg:row-span-2')
  expect(section.className).not.toMatch(/border|glass/)
  const copy = (lng === 'ru' ? ru : uk).benefits
  expect(within(section).getAllByRole('heading', { level: 3 }).map(el => el.textContent)).toEqual([
    copy.goldTitle, copy.limitsTitle, copy.adsTitle, copy.communityTitle, `${copy.chatTitle} ${copy.soon}`,
  ])
  expect(items[1]!.className).toContain('lg:col-start-2 lg:row-start-1')
  expect(items[2]!.className).toContain('lg:col-start-2 lg:row-start-2')
  expect(items[3]!.className).toContain('lg:col-start-3 lg:row-start-1')
  expect(items[4]!.className).toContain('lg:col-start-3 lg:row-start-2')
  expect(within(items[4]!).getByText(copy.soon)).toBeTruthy()
  const limitsText = within(items[1]!).getByText(copy.limits.replace('\n', ' '))
  expect(limitsText.textContent).toBe(copy.limits)
  expect(limitsText.className).toContain('whitespace-pre-line')
})
