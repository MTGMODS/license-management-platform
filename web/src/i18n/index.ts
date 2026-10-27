import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import {
  DEFAULT_LOCALE,
  readStoredLocale,
  resolveAutoLocale,
  SUPPORTED_LOCALES,
  isSupportedLocale,
} from './config'
import { defaultNS, resources } from './resources'

void i18n
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    lng: readStoredLocale() ?? resolveAutoLocale(),
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  })

function syncDocumentLanguage(language: string): void {
  document.documentElement.lang = isSupportedLocale(language) ? language : DEFAULT_LOCALE
}

syncDocumentLanguage(i18n.resolvedLanguage ?? DEFAULT_LOCALE)
i18n.on('languageChanged', syncDocumentLanguage)
