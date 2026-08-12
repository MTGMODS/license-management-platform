export const SUPPORTED_LOCALES = ['ru', 'uk'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Russian is the fallback: the audience is predominantly Russian-speaking and
 * the spec treats `uk` as an opt-in for Ukrainian browsers only.
 */
export const DEFAULT_LOCALE: Locale = 'ru'

export const LOCALE_STORAGE_KEY = 'mtg.locale'

/** Cookie name for a manual locale override (`mtg.locale=uk`). */
export const LOCALE_COOKIE_KEY = 'mtg.locale'

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale)
}

/** Manual override from localStorage or cookie; null when unset. */
export function readStoredLocale(): Locale | null {
  try {
    const fromStorage = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isSupportedLocale(fromStorage)) return fromStorage
  } catch {
    // private mode / blocked storage
  }

  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE_KEY}=([^;]+)`))
  const fromCookie = match?.[1]?.trim()
  if (isSupportedLocale(fromCookie)) return fromCookie

  return null
}

/** True for any BCP-47 Ukrainian tag: `uk`, `uk-UA`, `uk-UA-u-nu-latn`, … */
export function isUkrainianLanguageTag(tag: string): boolean {
  const normalized = tag.trim().toLowerCase()
  return normalized === 'uk' || normalized.startsWith('uk-')
}

/** Primary browser language (`languages[0]` with `language` fallback). */
function preferredBrowserLanguage(): string {
  const fromList = navigator.languages?.[0]
  if (typeof fromList === 'string' && fromList.length > 0) return fromList
  return navigator.language ?? ''
}

/** Browser default: Ukrainian for any `uk*` primary locale, otherwise Russian. */
export function resolveAutoLocale(): Locale {
  if (isUkrainianLanguageTag(preferredBrowserLanguage())) return 'uk'
  return DEFAULT_LOCALE
}
