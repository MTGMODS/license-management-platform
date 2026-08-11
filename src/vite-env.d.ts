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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
