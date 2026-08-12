/**
 * Business values the backend does not serve yet.
 *
 * Pricing lives here until the License Service exposes a catalog. Media URLs
 * come from Vite env so CDN / YouTube can change without a code edit.
 */

export interface PricingTier {
  /** Matches `duration_days` on a generated licence. */
  days: number
  priceUsd: number
  /** Highlighted in the pricing grid as the recommended option. */
  featured?: boolean
}

export const PRICING_CURRENCY = 'USD'

export const PRICING_TIERS: PricingTier[] = [
  { days: 7, priceUsd: 1 },
  { days: 30, priceUsd: 3 },
  { days: 90, priceUsd: 6, featured: true },
  { days: 365, priceUsd: 15 },
]

/**
 * Version manifest published alongside the helper. Served from raw
 * githubusercontent, which sends `Access-Control-Allow-Origin: *`, so the
 * browser may read it directly.
 */
export const RELEASE_MANIFEST_URL =
  'https://raw.githubusercontent.com/MTGMODS/arizona-helper/main/Update.json'

/**
 * Used only if the manifest is unreachable or omits `update_url`. The manifest
 * carries the same link, which keeps the download in step with the version.
 */
export const FREE_LUA_FALLBACK_URL =
  'https://github.com/MTGMODS/arizona-helper/raw/refs/heads/main/Arizona%20Helper.lua'

/**
 * Placeholder path: no installer has been built yet. The download button
 * probes this URL first and reports that the installer is still being prepared
 * rather than navigating the user into a 404 page.
 */
export const PC_INSTALLER_URL = '/helper/download/installer.exe'

function readEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

/** Accepts a bare 11-char id or a youtu.be / watch / embed URL. */
export function parseYoutubeId(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (/^[\w-]{11}$/.test(value)) return value

  try {
    const url = new URL(value)
    if (url.hostname.replace(/^www\./, '') === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }
    const fromQuery = url.searchParams.get('v')
    if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) return fromQuery
    const embed = url.pathname.match(/\/(?:embed|shorts)\/([\w-]{11})/)
    return embed?.[1] ?? null
  } catch {
    return null
  }
}

function normalizeCdnBase(raw: string): string {
  let base = raw.replace(/\/+$/, '')
  if (!base) return ''
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`
  return base
}

/** YouTube id for the gallery and the beginner guide (`VITE_HELPER_VIDEO_URL`). */
export const HELPER_VIDEO_ID: string | null = parseYoutubeId(readEnv('VITE_HELPER_VIDEO_URL'))

/**
 * Nine screenshots at `{base}/1.png` … `{base}/9.png`
 * (`VITE_HELPER_SCREENSHOTS_BASE`, e.g. `cdn.mtgmods.com/helper/logo`).
 *
 * Special value `placehold` fills the slots with numbered PNG placeholders
 * from placehold.co for local layout testing.
 */
const SCREENSHOTS_BASE = normalizeCdnBase(readEnv('VITE_HELPER_SCREENSHOTS_BASE'))
const USE_PLACEHOLD_SHOTS =
  readEnv('VITE_HELPER_SCREENSHOTS_BASE').toLowerCase() === 'placehold'

export const HELPER_SCREENSHOTS: { src: string; altKey: string; index: number }[] = USE_PLACEHOLD_SHOTS
  ? Array.from({ length: 9 }, (_, offset) => {
      const index = offset + 1
      return {
        index,
        src: `https://placehold.co/960x540/12121a/8b8ba3/png?text=${index}`,
        altKey: 'gallery.screenshotAlt',
      }
    })
  : SCREENSHOTS_BASE
    ? Array.from({ length: 9 }, (_, offset) => {
        const index = offset + 1
        return {
          index,
          src: `${SCREENSHOTS_BASE}/${index}.png`,
          altKey: 'gallery.screenshotAlt',
        }
      })
    : []

/** YouTube poster used in gallery thumbnails. */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}
