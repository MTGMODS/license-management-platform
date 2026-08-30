/** Public site origin for canonical URLs and Open Graph (no trailing slash). */
export function siteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  return 'https://mtgmods.com'
}

export const SITE_NAME = 'MTG MODS'

/** Served from /public; used as og:image and twitter:image. */
export const DEFAULT_OG_IMAGE_PATH = '/og.png'
