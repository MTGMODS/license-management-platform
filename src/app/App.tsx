import { useTranslation } from 'react-i18next'

import { useLocale } from '@/i18n/useLocale'

export function App() {
  const { t } = useTranslation(['common', 'home'])
  const { locale, setLocale } = useLocale()

  return (
    <div className="shell py-24">
      <h1 className="text-gradient text-5xl font-semibold tracking-tight">{t('common:brand')}</h1>
      <p className="mt-4 text-fg-muted">{t('home:hero.tagline')}</p>
      <button
        type="button"
        className="mt-8 rounded-lg border border-ink-600 px-4 py-2 text-sm"
        onClick={() => setLocale(locale === 'ru' ? 'uk' : 'ru')}
      >
        {t('common:language.label')}: {locale}
      </button>
    </div>
  )
}
