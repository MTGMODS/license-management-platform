import type { defaultNS, resources } from './resources'

/**
 * Derives translation key types from the Russian bundle so `t()` autocompletes
 * and a typo becomes a compile error rather than a raw key rendered on screen.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: (typeof resources)['ru']
    returnNull: false
  }
}
