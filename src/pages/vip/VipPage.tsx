import { useTranslation } from 'react-i18next'

import { PagePlaceholder } from '@/pages/PagePlaceholder'

export function VipPage() {
  const { t } = useTranslation('header')
  return <PagePlaceholder title={t('nav.vip')} />
}
