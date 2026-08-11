import { useTranslation } from 'react-i18next'

import { SUPPORTED_LOCALES } from '@/i18n/config'
import { useLocale } from '@/i18n/useLocale'
import { cn } from '@/shared/lib/cn'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  const { locale, setLocale } = useLocale()

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={cn('flex items-center rounded-lg bg-ink-800 p-0.5 ring-1 ring-white/5', className)}
    >
      {SUPPORTED_LOCALES.map((code) => {
        const active = code === locale
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => setLocale(code)}
            className={cn(
              'rounded-md px-2 py-1 text-xs font-medium uppercase transition-colors duration-200',
              active ? 'bg-ink-700 text-fg' : 'text-fg-subtle hover:text-fg-muted',
            )}
          >
            {code}
          </button>
        )
      })}
    </div>
  )
}
