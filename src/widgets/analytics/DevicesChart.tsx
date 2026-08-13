import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { DeviceFamilyStats, PeriodKey } from '@/shared/api/usage'
import { useFormatters } from '@/shared/lib/format'
import { Card } from '@/shared/ui'

import { AXIS_PROPS, barActiveProps, CHART, type ChartMetric, chartColor } from './chartTheme'
import { ChartTooltip } from './ChartTooltip'

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
      id: 'pc',
      label: t('analytics.devices.pc'),
      users: devices.pc.users[period],
      launches: devices.pc.launches[period],
    },
    {
      id: 'mobile',
      label: t('analytics.devices.mobile'),
      users: devices.mobile.users[period],
      launches: devices.mobile.launches[period],
    },
  ]
    .filter((row) => row[metric] > 0)
    .sort((a, b) => b[metric] - a[metric])

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('analytics.devices.title')}</h3>
      <p className="mt-1 text-sm text-fg-muted">{t('analytics.devices.subtitle')}</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('analytics.empty')}</p>
      ) : (
        <div className="mt-6" style={{ height: Math.max(160, rows.length * 48 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              accessibilityLayer={false}
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
            >
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" {...AXIS_PROPS} tickFormatter={format.compact} />
              <YAxis type="category" dataKey="label" {...AXIS_PROPS} width={100} />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as (typeof rows)[number] | undefined
                  if (!active || !point) return null

                  return (
                    <ChartTooltip
                      title={point.label}
                      rows={[
                        {
                          label: t('analytics.metric.users'),
                          value: format.number(point.users),
                          color: CHART.users,
                        },
                        {
                          label: t('analytics.metric.launches'),
                          value: format.number(point.launches),
                          color: CHART.launches,
                        },
                      ]}
                    />
                  )
                }}
              />
              <Bar
                dataKey={metric}
                fill={color}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
                activeBar={barActiveProps(color)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
