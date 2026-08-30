/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Public API gateway, e.g. https://api.mtgmods.com.
   * Baked into production builds. In `vite` dev the browser stays same-origin
   * and this value is only the proxy fallback for prefixes without a DEV target.
   */
  readonly VITE_API_URL?: string

  /** Direct local service for the Vite proxy (and OAuth cookie host). */
  readonly VITE_DEV_USER_TARGET?: string
  readonly VITE_DEV_LICENSE_TARGET?: string
  readonly VITE_DEV_USAGE_TARGET?: string
  readonly VITE_DEV_DISTRIBUTION_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
