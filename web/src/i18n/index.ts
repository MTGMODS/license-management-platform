import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  readStoredLocale,
  resolveAutoLocale,
  SUPPORTED_LOCALES,
  isSupportedLocale,
} from './config'
import { defaultNS, resources } from './resources'

const localeDetector = new LanguageDetector()
localeDetector.addDetector({
  name: 'mtgLocale',
  lookup() {
    return readStoredLocale() ?? resolveAutoLocale()
  },
  cacheUserLanguage(language) {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, language)
    } catch {
      // ignore
    }
  },
})

void i18n
  .use(localeDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['mtgLocale'],
      caches: ['localStorage'],
    },
    returnNull: false,
  })

function syncDocumentLanguage(language: string): void {
  document.documentElement.lang = isSupportedLocale(language) ? language : DEFAULT_LOCALE
}

syncDocumentLanguage(i18n.resolvedLanguage ?? DEFAULT_LOCALE)
i18n.on('languageChanged', syncDocumentLanguage)

export { i18n }
