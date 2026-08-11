import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { PeriodKey, ServerStats } from '@/shared/api/usage'
import { useFormatters } from '@/shared/lib/format'
import { Card, SegmentedControl } from '@/shared/ui'

import { AXIS_PROPS, CHART } from './chartTheme'
import { ChartTooltip } from './ChartTooltip'

type TopLimit = 5 | 10 | 20 | 0

interface ServersChartProps {
  servers: ServerStats[]
  period: PeriodKey
}

export function ServersChart({ servers, period }: ServersChartProps) {
  const { t } = useTranslation('helper')
  const format = useFormatters()
  const [limit, setLimit] = useState<TopLimit>(10)

  const ranked = [...servers]
    .sort((a, b) => b.users[period] - a.users[period])
    .filter((item) => item.users[period] > 0)

  const visible = limit === 0 ? ranked : ranked.slice(0, limit)

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{t('analytics.servers.title')}</h3>
          <p className="mt-1 text-sm text-fg-muted">{t('analytics.servers.subtitle')}</p>
        </div>

        <SegmentedControl
          size="sm"
          label={t('analytics.servers.title')}
          value={limit}
          onChange={setLimit}
          options={[
            { id: 5, label: t('analytics.servers.top', { count: 5 }) },
            { id: 10, label: t('analytics.servers.top', { count: 10 }) },
            { id: 20, label: t('analytics.servers.top', { count: 20 }) },
            { id: 0, label: t('analytics.servers.all') },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('analytics.empty')}</p>
      ) : (
        // Horizontal bars with a row-proportional height: 45 servers would be
        // unreadable squeezed into a fixed box.
        <div className="mt-6" style={{ height: Math.max(220, visible.length * 26 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={visible}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
            >
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" {...AXIS_PROPS} tickFormatter={format.compact} />
              <YAxis
                type="category"
                dataKey="server"
                {...AXIS_PROPS}
                width={92}
                tickFormatter={(id: number) => t('analytics.servers.name', { id })}
              />
              <Tooltip
                cursor={{ fill: CHART.cursor }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as ServerStats | undefined
                  if (!active || !point) return null

                  return (
                    <ChartTooltip
                      title={t('analytics.servers.name', { id: point.server })}
                      rows={[
                        {
                          label: t('analytics.metric.users'),
                          value: format.number(point.users[period]),
                          color: CHART.users,
                        },
                        {
                          label: t('analytics.metric.launches'),
                          value: format.number(point.launches[period]),
                          color: CHART.launches,
                        },
                      ]}
                    />
                  )
                }}
              />
              <Bar
                dataKey={`users.${period}`}
                fill={CHART.users}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
