/**
 * Minimal surface of the Telegram Mini App SDK that this app relies on.
 * The script is loaded from `index.html`, so the global may legitimately be
 * absent when the site runs in a normal browser.
 */
interface TelegramWebApp {
  initData: string
  platform?: string
  version?: string
  ready: () => void
  expand: () => void
  colorScheme?: 'light' | 'dark'
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

const INIT_DATA_STORAGE_KEY = 'mtg_tg_init_data'

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

/**
 * Telegram puts launch params in the URL hash (`#tgWebAppData=...`). The SDK
 * usually copies them into `WebApp.initData`, but SPA navigations / ngrok
 * interstitial can leave the SDK empty while the hash (or a prior capture)
 * still has the signed payload.
 */
function readTgWebAppDataFromUrl(): string | null {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  if (hash.includes('tgWebAppData=')) {
    const value = new URLSearchParams(hash).get('tgWebAppData')
    if (value) return value
  }

  return new URLSearchParams(window.location.search).get('tgWebAppData')
}

function persistInitData(value: string): string {
  try {
    sessionStorage.setItem(INIT_DATA_STORAGE_KEY, value)
  } catch {
    // private mode / quota — still return the live value
  }
  return value
}

/**
 * True only when Telegram actually handed us signed launch data. The SDK
 * script is present on every page, so checking for the global alone would
 * misreport a plain browser as a Mini App.
 */
export function isTelegramMiniApp(): boolean {
  return getTelegramInitData() !== null
}

/**
 * Telegram in-app browser or Mini App shell — even when initData is missing
 * (e.g. opened as a plain link inside Telegram).
 */
export function isInsideTelegramShell(): boolean {
  if (getTelegramInitData()) return true

  const webApp = getTelegramWebApp()
  if (webApp?.platform && webApp.platform !== 'unknown') return true

  return /Telegram/i.test(navigator.userAgent)
}

export function getTelegramInitData(): string | null {
  const fromSdk = getTelegramWebApp()?.initData
  if (fromSdk && fromSdk.length > 0) return persistInitData(fromSdk)

  const fromUrl = readTgWebAppDataFromUrl()
  if (fromUrl && fromUrl.length > 0) return persistInitData(fromUrl)

  try {
    const stored = sessionStorage.getItem(INIT_DATA_STORAGE_KEY)
    if (stored && stored.length > 0) return stored
  } catch {
    // ignore
  }

  return null
}

export function getTelegramUserIdFromInitData(initData: string): string | null {
  const userRaw = new URLSearchParams(initData).get('user')
  if (!userRaw) return null
  try {
    const parsed: unknown = JSON.parse(userRaw)
    if (typeof parsed !== 'object' || parsed === null || !('id' in parsed)) return null
    const id = parsed.id
    return typeof id === 'number' || typeof id === 'string' ? String(id) : null
  } catch {
    return null
  }
}

/**
 * Capture initData as early as possible (before SPA routes rewrite the URL).
 */
export function captureTelegramInitData(): void {
  void getTelegramInitData()
}

/**
 * Tells Telegram the UI is ready and matches the chrome to the dark theme.
 * No-ops outside a Mini App: the SDK script is present on every page, and
 * calling into it from a plain browser only emits unsupported-method warnings.
 */
export function initTelegramChrome(): void {
  captureTelegramInitData()

  const webApp = getTelegramWebApp()
  if (!webApp) return

  // Call ready/expand whenever the SDK is present inside Telegram — even if
  // initData arrives a tick later from the hash.
  if (!isInsideTelegramShell() && !webApp.initData) return

  webApp.ready()
  webApp.expand()
  webApp.setHeaderColor?.('#07070b')
  webApp.setBackgroundColor?.('#07070b')
}
