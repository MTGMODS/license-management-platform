import { useTranslation } from 'react-i18next'

import { PagePlaceholder } from '@/pages/PagePlaceholder'

export function DashboardPage() {
  const { t } = useTranslation('header')
  return <PagePlaceholder title={t('account.cabinet')} />
}
