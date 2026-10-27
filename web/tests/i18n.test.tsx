import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { AppProviders } from '../src/app/providers'
import { isSupportedLocale, LOCALE_STORAGE_KEY, readStoredLocale, resolveAutoLocale } from '../src/i18n/config'
import { resources } from '../src/i18n/resources'
import { applyPageMeta } from '../src/shared/lib/pageMeta'

const geoLookup = vi.hoisted(() => vi.fn(() => { throw new Error('Language must not request geolocation') }))
vi.mock('@/features/geo/useViewerCountry', () => ({ useViewerCountry: geoLookup }))
vi.mock('@/features/auth', () => ({ AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</> }))

beforeEach(() => {
  sessionStorage.clear()
  document.cookie = 'mtg.locale=; max-age=0; path=/'
  geoLookup.mockClear()
})
afterEach(() => vi.restoreAllMocks())

function browserLanguage(primary: string, secondary: string[] = []) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue([primary, ...secondary])
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(primary)
}

it.each([
  ['ru-RU', 'ru'], ['de-DE', 'ru'], ['pl-PL', 'ru'], ['fr-FR', 'ru'], ['', 'ru'],
  ['en', 'en'], ['en-US', 'en'], ['en-GB', 'en'], ['en-AU', 'en'], ['EN-ca', 'en'],
  ['uk', 'uk'], ['uk-UA', 'uk'], ['uk-UA-u-nu-latn', 'uk'],
])('selects %s browser language as %s without guessing from other countries', (language, expected) => {
  browserLanguage(language)
  expect(resolveAutoLocale()).toBe(expected)
})

it.each([['ru-RU', 'ru'], ['de-DE', 'ru'], ['en-US', 'en'], ['en-GB', 'en'], ['uk-UA', 'uk']])('ignores cached Ukraine with an %s browser', (language, expected) => {
  browserLanguage(language)
  sessionStorage.setItem('mtg:viewer-country', 'UA')
  expect(resolveAutoLocale()).toBe(expected)
})

it('uses the primary browser language and falls back to navigator.language when the list is empty', () => {
  browserLanguage('de-DE', ['en-US', 'uk-UA'])
  expect(resolveAutoLocale()).toBe('ru')
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue([])
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-NZ')
  expect(resolveAutoLocale()).toBe('en')
})

it('ignores the old automatic locale cache', () => {
  browserLanguage('ru-RU')
  localStorage.setItem('mtg.locale', 'ru')
  sessionStorage.setItem('mtg:viewer-country', 'UA')
  expect(readStoredLocale()).toBeNull()
  expect(resolveAutoLocale()).toBe('ru')
})

it('accepts only supported explicit language overrides from storage or a cookie', () => {
  expect(isSupportedLocale('en')).toBe(true)
  expect(isSupportedLocale('de')).toBe(false)
  localStorage.setItem(LOCALE_STORAGE_KEY, 'de')
  expect(readStoredLocale()).toBeNull()
  document.cookie = 'mtg.locale=en; path=/'
  expect(readStoredLocale()).toBe('en')
  localStorage.setItem(LOCALE_STORAGE_KEY, 'uk')
  expect(readStoredLocale()).toBe('uk')
})

function Probe() {
  const { t } = useTranslation('header')
  return <p>{t('nav.vip')}</p>
}

async function localizedApp() {
  const i18n = createInstance()
  await i18n.init({ lng: readStoredLocale() ?? resolveAutoLocale(), resources, defaultNS: 'common', fallbackLng: 'ru' })
  const tree = () => <I18nextProvider i18n={i18n}><AppProviders><Probe /></AppProviders></I18nextProvider>
  return { i18n, tree, view: render(tree()) }
}

it('uses a manual language override ahead of the browser language', async () => {
  browserLanguage('en-US')
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ru')
  await localizedApp()
  expect(screen.getByText('Подписка')).toBeTruthy()
})

it.each([['en-US', 'Subscription'], ['fr-FR', 'Подписка'], ['uk-UA', 'Підписка']])('renders immediately without a language geolocation lookup: %s', async (language, expected) => {
  browserLanguage(language)
  await localizedApp()
  expect(screen.getByText(expected)).toBeTruthy()
  expect(geoLookup).not.toHaveBeenCalled()
})

function leaves(value: unknown, prefix = ''): [string, string][] {
  return typeof value === 'string' ? [[prefix, value]]
    : Object.entries(value as object).flatMap(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key))
}

it('translates every namespace, preserving placeholders, rich text and legal document structure', () => {
  expect(Object.keys(resources.en).sort()).toEqual(Object.keys(resources.ru).sort())
  const ru = new Map(leaves(resources.ru).filter(([key]) => !/_(few|many)$/.test(key)))
  const en = new Map(leaves(resources.en))
  expect([...en.keys()].sort()).toEqual([...ru.keys()].sort())
  const tokens = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map(match => match[0]).sort()
  for (const [key, source] of ru) {
    const text = en.get(key)!
    expect(text.trim(), key).not.toBe('')
    expect(text, key).not.toMatch(/[А-Яа-яЁёІіЇїЄєҐґ]/)
    expect(tokens(text, /{{[^}]+}}/g), key).toEqual(tokens(source, /{{[^}]+}}/g))
    expect(tokens(text, /<\/?[a-z]+>/gi), key).toEqual(tokens(source, /<\/?[a-z]+>/gi))
    if (key.startsWith('terms.sections.') && /\.(type|key)$/.test(key)) expect(text, key).toBe(source)
  }
})

it('uses English singular/plural forms and dynamic sales headings without Russian fallback', async () => {
  const i18n = createInstance()
  await i18n.init({ lng: 'en', resources, fallbackLng: 'ru' })
  expect(i18n.t('vip:pricing.days', { count: 1 })).toBe('1 day')
  expect(i18n.t('vip:pricing.days', { count: 30 })).toBe('30 days')
  expect(i18n.t('common:units.minutes', { count: 2 })).toBe('2 minutes')
  expect(i18n.t('vip:stats.salesList.title', { context: 'day' })).toBe('Detailed sales list for the day')
})

it('updates English HTML/OG language and replaces alternate locales on a language change', () => {
  const meta = { title: 'MTG MODS', description: 'Public statistics', pathname: '/vip' }
  applyPageMeta({ ...meta, locale: 'en' })
  expect(document.documentElement.lang).toBe('en')
  expect(document.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe('en_US')
  const alternates = () => [...document.querySelectorAll('meta[property="og:locale:alternate"]')].map(el => el.getAttribute('content'))
  expect(alternates()).toEqual(['ru_RU', 'uk_UA'])
  applyPageMeta({ ...meta, locale: 'uk' })
  expect(alternates()).toEqual(['ru_RU', 'en_US'])
})
