import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { buttonStyles } from '@/shared/ui'

export function NotFoundPage() {
  const { t } = useTranslation('common')

  return (
    <div className="shell flex flex-col items-center py-28 text-center">
      <p className="font-mono text-6xl font-semibold text-ink-500">404</p>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{t('notFound.title')}</h1>
      <p className="mt-2 max-w-sm text-sm text-fg-muted">{t('notFound.body')}</p>
      <Link to="/" className={buttonStyles({ variant: 'secondary', className: 'mt-8' })}>
        {t('notFound.action')}
      </Link>
    </div>
  )
}
