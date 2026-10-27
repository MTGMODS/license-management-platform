export const SUPPORTED_LOCALES = ['ru', 'uk', 'en'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

/** Used for browsers outside the explicit Ukrainian/English rules. */
export const DEFAULT_LOCALE: Locale = 'ru'

// The old mtg.locale entry cached automatic detection, not a manual choice.
export const LOCALE_STORAGE_KEY = 'mtg.locale.override'

/** Cookie name for a manual locale override (`mtg.locale=uk`). */
const LOCALE_COOKIE_KEY = 'mtg.locale'

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

/** Primary browser language (`languages[0]` with `language` fallback). */
function preferredBrowserLanguage(): string {
  const fromList = navigator.languages?.[0]
  if (typeof fromList === 'string' && fromList.length > 0) return fromList
  return navigator.language ?? ''
}

/** Use only the primary browser language, independently of location. */
export function resolveAutoLocale(): Locale {
  const language = preferredBrowserLanguage().trim().toLowerCase().split('-')[0]
  if (language === 'uk') return 'uk'
  return language === 'en' ? 'en' : DEFAULT_LOCALE
}
