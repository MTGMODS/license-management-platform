/**
 * Minimal surface of the Telegram Mini App SDK that this app relies on.
 * The script is loaded from `index.html`, so the global may legitimately be
 * absent when the site runs in a normal browser.
 */
interface TelegramWebApp {
  initData: string
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

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

/**
 * True only when Telegram actually handed us signed launch data. The SDK
 * script is present on every page, so checking for the global alone would
 * misreport a plain browser as a Mini App.
 */
export function isTelegramMiniApp(): boolean {
  const webApp = getTelegramWebApp()
  return Boolean(webApp && webApp.initData.length > 0)
}

export function getTelegramInitData(): string | null {
  const webApp = getTelegramWebApp()
  if (!webApp || webApp.initData.length === 0) return null
  return webApp.initData
}

/**
 * Tells Telegram the UI is ready and matches the chrome to the dark theme.
 * No-ops outside a Mini App: the SDK script is present on every page, and
 * calling into it from a plain browser only emits unsupported-method warnings.
 */
export function initTelegramChrome(): void {
  const webApp = getTelegramWebApp()
  if (!webApp || !isTelegramMiniApp()) return

  webApp.ready()
  webApp.expand()
  webApp.setHeaderColor?.('#07070b')
  webApp.setBackgroundColor?.('#07070b')
}
