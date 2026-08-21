const STORAGE_KEY = 'mtg:viewer-country'
const FETCH_MS = 4500

/** ISO 3166-1 alpha-2. Resolved from the visitor IP, never from UI language. */
export type CountryCode = string

/**
 * Direct UA card / SWIFT is unavailable for these countries (sanctions / rails).
 * Detected via IP geolocation — locale must not gate this.
 */
export const BANK_CARD_BLOCKED_COUNTRIES = new Set(['RU', 'BY'])

export function isBankCardAllowed(countryCode: CountryCode | null): boolean {
  if (!countryCode) return true
  return !BANK_CARD_BLOCKED_COUNTRIES.has(countryCode)
}

function normalizeCountry(raw: unknown): CountryCode | null {
  if (typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : null
}

function readCachedCountry(): CountryCode | null {
  try {
    return normalizeCountry(sessionStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

function writeCachedCountry(code: CountryCode) {
  try {
    sessionStorage.setItem(STORAGE_KEY, code)
  } catch {
    /* private mode / quota */
  }
}

async function fetchJsonCountry(
  url: string,
  pick: (data: Record<string, unknown>) => unknown,
  signal: AbortSignal,
): Promise<CountryCode | null> {
  const response = await fetch(url, { signal, credentials: 'omit' })
  if (!response.ok) return null
  const data = (await response.json()) as Record<string, unknown>
  return normalizeCountry(pick(data))
}

/**
 * Best-effort ISO country from public IP. Tries two CORS-friendly providers.
 * Returns null when offline / blocked / timed out — callers should not treat
 * that as Russia/Belarus.
 */
export async function resolveViewerCountry(signal?: AbortSignal): Promise<CountryCode | null> {
  const cached = readCachedCountry()
  if (cached) return cached

  const controller = new AbortController()
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  const timeout = window.setTimeout(() => controller.abort(), FETCH_MS)

  try {
    const code =
      (await fetchJsonCountry(
        'https://get.geojs.io/v1/ip/country.json',
        (data) => data.country,
        controller.signal,
      )) ??
      (await fetchJsonCountry(
        'https://ipwho.is/',
        (data) => (data.success === false ? null : data.country_code),
        controller.signal,
      ))

    if (code) writeCachedCountry(code)
    return code
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', onAbort)
  }
}
