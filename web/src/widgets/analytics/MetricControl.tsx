import { useTranslation } from 'react-i18next'

import { SegmentedControl } from '@/shared/ui'

import { type ChartMetric, CHART_METRICS } from './chartTheme'

interface MetricControlProps {
  value: ChartMetric
  onChange: (value: ChartMetric) => void
}

export function MetricControl({ value, onChange }: MetricControlProps) {
  const { t } = useTranslation('helper')

  return (
    <SegmentedControl
      size="sm"
      label={t('analytics.metric.label')}
      value={value}
      onChange={onChange}
      options={CHART_METRICS.map((key) => ({
        id: key,
        label: t(`analytics.metric.${key}`),
      }))}
    />
  )
}
