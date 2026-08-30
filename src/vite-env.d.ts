/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute base URLs per backend service. Empty in development, where the
   * Vite proxy keeps every request same-origin.
   */
  readonly VITE_USER_API_URL?: string
  readonly VITE_LICENSE_API_URL?: string
  readonly VITE_USAGE_API_URL?: string
  readonly VITE_DISTRIBUTION_API_URL?: string

  /** Direct service targets for the Vite proxy (and OAuth cookie host). */
  readonly VITE_DEV_USER_TARGET?: string
  readonly VITE_DEV_LICENSE_TARGET?: string
  readonly VITE_DEV_USAGE_TARGET?: string
  readonly VITE_DEV_DISTRIBUTION_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
