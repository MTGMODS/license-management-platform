import { useTranslation } from 'react-i18next'

import type { DeviceFamilyStats, PeriodKey } from '@/shared/api/usage'
import { useFormatters } from '@/shared/lib/format'
import { Card } from '@/shared/ui'

import { CategoryBarChart } from './CategoryBarChart'
import { type ChartMetric, chartColor } from './chartTheme'
import { ChartTooltip, statsTooltipRows } from './ChartTooltip'

interface DevicesChartProps {
  devices: {
    pc: DeviceFamilyStats
    mobile: DeviceFamilyStats
  }
  period: PeriodKey
  metric: ChartMetric
}

export function DevicesChart({ devices, period, metric }: DevicesChartProps) {
  const { t } = useTranslation('helper')
  const format = useFormatters()
  const color = chartColor(metric)

  const rows = [
    {
      id: 'pc' as const,
      label: t('analytics.devices.pc'),
      users: devices.pc.users[period],
      launches: devices.pc.launches[period],
      vip_users: devices.pc.vip_users[period],
      user_share: devices.pc.user_share[period],
      launches_per_user: devices.pc.launches_per_user[period],
      vip_percent: devices.pc.vip_percent[period],
    },
    {
      id: 'mobile' as const,
      label: t('analytics.devices.mobile'),
      users: devices.mobile.users[period],
      launches: devices.mobile.launches[period],
      vip_users: devices.mobile.vip_users[period],
      user_share: devices.mobile.user_share[period],
      launches_per_user: devices.mobile.launches_per_user[period],
      vip_percent: devices.mobile.vip_percent[period],
    },
  ]
    .filter((row) => row[metric] > 0)
    .sort((a, b) => b[metric] - a[metric])

  return (
    <Card className="p-4 text-left sm:p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('analytics.devices.title')}</h3>
      <p className="mt-1 text-sm text-fg-muted">{t('analytics.devices.subtitle')}</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('analytics.empty')}</p>
      ) : (
        <CategoryBarChart
          data={rows}
          dataKey={metric}
          color={color}
          renderTooltip={(point) => (
            <ChartTooltip title={point.label} rows={statsTooltipRows(t, format, point)} />
          )}
        />
      )}
    </Card>
  )
}
