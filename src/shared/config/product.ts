/**
 * Business values the backend does not serve yet.
 *
 * Everything here is a deliberate stand-in. The License Service exposes no
 * pricing endpoint and the Distribution Service only serves VIP builds, so
 * these live in one place to be swapped for API calls later without touching
 * a single component.
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

/** YouTube id for the gallery and the beginner guide; not yet supplied. */
export const HELPER_VIDEO_ID: string | null = null

/** Screenshots for the media gallery; none supplied yet. */
export const HELPER_SCREENSHOTS: { src: string; alt: string }[] = []
