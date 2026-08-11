export const SUPPORTED_LOCALES = ['ru', 'uk'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Russian is the fallback: the audience is predominantly Russian-speaking and
 * the spec treats `uk` as an opt-in for Ukrainian browsers only.
 */
export const DEFAULT_LOCALE: Locale = 'ru'

export const LOCALE_STORAGE_KEY = 'mtg.locale'

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale)
}
