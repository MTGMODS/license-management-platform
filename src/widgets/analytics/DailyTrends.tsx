import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { DailyPoint } from '@/shared/api/usage'
import { useFormatters } from '@/shared/lib/format'
import { Card, SegmentedControl } from '@/shared/ui'

import { AXIS_PROPS, CHART, Y_AXIS_NUMERIC } from './chartTheme'
import { ChartTooltip } from './ChartTooltip'

type Metric = 'users' | 'launches'

export function DailyTrends({ daily }: { daily: DailyPoint[] }) {
  const { t } = useTranslation('helper')
  const format = useFormatters()
  const [metric, setMetric] = useState<Metric>('users')

  const color = metric === 'users' ? CHART.users : CHART.launches

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{t('analytics.daily.title')}</h3>
          <p className="mt-1 text-sm text-fg-muted">{t('analytics.daily.subtitle')}</p>
        </div>

        <SegmentedControl
          size="sm"
          label={t('analytics.metric.users')}
          value={metric}
          onChange={setMetric}
          options={[
            { id: 'users', label: t('analytics.metric.users') },
            { id: 'launches', label: t('analytics.metric.launches') },
          ]}
        />
      </div>

      {daily.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('analytics.empty')}</p>
      ) : (
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart accessibilityLayer={false} data={daily} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={`daily-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="date"
                {...AXIS_PROPS}
                tickFormatter={format.dayMonth}
                minTickGap={28}
              />
              <YAxis {...Y_AXIS_NUMERIC} tickFormatter={format.compact} />
              <Tooltip
                cursor={{ stroke: CHART.axis, strokeDasharray: '4 4' }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as DailyPoint | undefined
                  if (!active || !point) return null

                  return (
                    <ChartTooltip
                      title={format.fullDate(point.date)}
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
              <Area
                type="monotone"
                dataKey={metric}
                stroke={color}
                strokeWidth={2}
                fill={`url(#daily-${metric})`}
                // The series is dense and redraws on every metric switch, so
                // per-point dots would add noise and cost.
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
