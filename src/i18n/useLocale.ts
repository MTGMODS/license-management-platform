import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from './config'

interface UseLocaleResult {
  locale: Locale
  setLocale: (next: Locale) => void
}

export function useLocale(): UseLocaleResult {
  const { i18n } = useTranslation()

  const resolved = i18n.resolvedLanguage ?? i18n.language
  const locale = isSupportedLocale(resolved) ? resolved : DEFAULT_LOCALE

  const setLocale = useCallback(
    (next: Locale) => {
      // The detector is configured to cache into localStorage, so an explicit
      // switch here also becomes the persisted preference.
      void i18n.changeLanguage(next)
    },
    [i18n],
  )

  return { locale, setLocale }
}
