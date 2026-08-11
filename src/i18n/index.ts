import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, isSupportedLocale } from './config'
import { defaultNS, resources } from './resources'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    // Collapse regional tags so `uk-UA` resolves to `uk`, while anything
    // unsupported (`en-US`, `pl`) falls through to Russian.
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    interpolation: {
      // React escapes rendered values already.
      escapeValue: false,
    },
    detection: {
      // A stored choice always wins over the browser preference.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
    },
    returnNull: false,
  })

function syncDocumentLanguage(language: string): void {
  document.documentElement.lang = isSupportedLocale(language) ? language : DEFAULT_LOCALE
}

syncDocumentLanguage(i18n.resolvedLanguage ?? DEFAULT_LOCALE)
i18n.on('languageChanged', syncDocumentLanguage)

export { i18n }
