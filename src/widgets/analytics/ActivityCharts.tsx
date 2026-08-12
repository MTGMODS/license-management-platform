import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { HourActivityPoint, WeekdayActivityPoint } from '@/shared/api/usage'
import { useFormatters } from '@/shared/lib/format'
import { Card } from '@/shared/ui'

import { AXIS_PROPS, barActiveProps, CHART, Y_AXIS_NUMERIC } from './chartTheme'
import { ChartTooltip } from './ChartTooltip'

interface ActivityChartsProps {
  hourly: HourActivityPoint[]
  weekday: WeekdayActivityPoint[]
}

/**
 * Both series are all-time aggregates with no per-period breakdown in the
 * payload, so they deliberately ignore the section's period selector and say
 * so rather than silently showing the same bars for every period.
 */
export function ActivityCharts({ hourly, weekday }: ActivityChartsProps) {
  const { t } = useTranslation('helper')
  const format = useFormatters()

  const peakHour = hourly.reduce<HourActivityPoint | null>(
    (best, point) => (!best || point.launches > best.launches ? point : best),
    null,
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold tracking-tight">{t('analytics.activity.hours')}</h3>
          <span className="text-xs text-fg-subtle">{t('analytics.utcNote')}</span>
        </div>

        <div className="mt-6 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={hourly} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="hour"
                {...AXIS_PROPS}
                interval={3}
                tickFormatter={(hour: number) => format.hour(hour)}
              />
              <YAxis {...Y_AXIS_NUMERIC} tickFormatter={format.compact} />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as HourActivityPoint | undefined
                  if (!active || !point) return null

                  return (
                    <ChartTooltip
                      title={format.hour(point.hour)}
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
                dataKey="launches"
                fill={CHART.users}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                activeBar={barActiveProps(CHART.users)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {peakHour ? (
          <p className="mt-3 text-sm text-fg-subtle">
            {t('analytics.activity.peakHour', { hour: format.hour(peakHour.hour) })}
          </p>
        ) : null}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold tracking-tight">
          {t('analytics.activity.weekdays')}
        </h3>

        <div className="mt-6 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={weekday} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="weekday"
                {...AXIS_PROPS}
                tickFormatter={(index: number) => format.weekdayShort(index)}
              />
              <YAxis {...Y_AXIS_NUMERIC} tickFormatter={format.compact} />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as WeekdayActivityPoint | undefined
                  if (!active || !point) return null

                  return (
                    <ChartTooltip
                      title={format.weekday(point.weekday)}
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
                dataKey="launches"
                fill={CHART.launches}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                activeBar={barActiveProps(CHART.launches)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
