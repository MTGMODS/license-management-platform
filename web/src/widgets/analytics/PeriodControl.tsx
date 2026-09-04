import { useTranslation } from 'react-i18next'

import { PERIOD_KEYS, type PeriodKey } from '@/shared/api/usage'
import { SegmentedControl } from '@/shared/ui'

interface PeriodControlProps {
  value: PeriodKey
  onChange: (value: PeriodKey) => void
}

export function PeriodControl({ value, onChange }: PeriodControlProps) {
  const { t } = useTranslation('helper')

  return (
    <SegmentedControl
      size="sm"
      label={t('analytics.period.label')}
      value={value}
      onChange={onChange}
      options={PERIOD_KEYS.map((key) => ({
        id: key,
        label: t(`analytics.period.${key}`),
      }))}
    />
  )
}
