import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { HourActivityPoint, WeekdayActivityPoint } from '@/shared/api/usage'
import { useFormatters } from '@/shared/lib/format'
import { shiftHourlyToLocal } from '@/shared/lib/timezone'
import { Card } from '@/shared/ui'

import { AXIS_PROPS, barActiveProps, CHART, type ChartMetric, chartColor, Y_AXIS_NUMERIC } from './chartTheme'
import { CHART_TOOLTIP_WRAPPER_STYLE, readTooltipViewBox } from './chartTooltipPosition'
import { ChartTooltip } from './ChartTooltip'
import { RechartsTooltipContent } from './RechartsTooltipContent'
import { statsTooltipRows } from './statsTooltip'
import { useExclusiveAnalyticsTooltip } from './useExclusiveAnalyticsTooltip'

interface ActivityChartsProps {
  hourly: HourActivityPoint[]
  weekday: WeekdayActivityPoint[]
  metric: ChartMetric
}

/** PostgreSQL `dow` is Sunday=0; charts should read Mon→Sun. */
function weekdayOrder(day: number): number {
  return day === 0 ? 7 : day
}

/**
 * All-time aggregates with no per-period breakdown in the payload. They live
 * under the "global all-time" section rather than following the period selector.
 */
export function ActivityCharts({ hourly, weekday, metric }: ActivityChartsProps) {
  const { t } = useTranslation('helper')
  const format = useFormatters()

  const localHourly = useMemo(() => shiftHourlyToLocal(hourly), [hourly])

  const weekdayMondayFirst = useMemo(
    () => [...weekday].sort((a, b) => weekdayOrder(a.weekday) - weekdayOrder(b.weekday)),
    [weekday],
  )

  const color = chartColor(metric)
  const [hourlyTooltipX, setHourlyTooltipX] = useState<number | undefined>()
  const [weekdayTooltipX, setWeekdayTooltipX] = useState<number | undefined>()
  const hourlyTooltip = useExclusiveAnalyticsTooltip()
  const weekdayTooltip = useExclusiveAnalyticsTooltip()

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4 text-left sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold tracking-tight">{t('analytics.activity.hours')}</h3>
          <span className="text-xs text-fg-subtle">{t('analytics.activity.localTime')}</span>
        </div>

        <div className="mt-6 h-56" ref={hourlyTooltip.surfaceRef} {...hourlyTooltip.surfaceProps}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={localHourly} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
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
                offset={8}
                trigger={hourlyTooltip.trigger}
                active={hourlyTooltip.tooltipActive}
                position={hourlyTooltipX != null ? { x: hourlyTooltipX } : undefined}
                wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                content={(props) => (
                  <RechartsTooltipContent
                    active={props.active}
                    payload={props.payload as ReadonlyArray<{ payload?: HourActivityPoint }> | undefined}
                    coordinate={props.coordinate}
                    viewBox={readTooltipViewBox(props)}
                    onClaim={hourlyTooltip.claim}
                    onPin={hourlyTooltip.coarse ? hourlyTooltip.pin : undefined}
                    onRelease={hourlyTooltip.coarse ? hourlyTooltip.dismiss : undefined}
                    suppressed={hourlyTooltip.suppressed}
                    onTranslateX={setHourlyTooltipX}
                    renderTooltip={(point) => (
                      <ChartTooltip
                        title={format.hour(point.hour)}
                        rows={statsTooltipRows(t, format, point)}
                      />
                    )}
                  />
                )}
              />
              <Bar
                dataKey={metric}
                fill={color}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                activeBar={barActiveProps(color)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4 text-left sm:p-6">
        <h3 className="text-lg font-semibold tracking-tight">
          {t('analytics.activity.weekdays')}
        </h3>

        <div className="mt-6 h-56" ref={weekdayTooltip.surfaceRef} {...weekdayTooltip.surfaceProps}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              accessibilityLayer={false}
              data={weekdayMondayFirst}
              margin={{ top: 4, right: 8, bottom: 0, left: 4 }}
            >
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="weekday"
                {...AXIS_PROPS}
                tickFormatter={(index: number) => format.weekdayShort(index)}
              />
              <YAxis {...Y_AXIS_NUMERIC} tickFormatter={format.compact} />
              <Tooltip
                cursor={false}
                offset={8}
                trigger={weekdayTooltip.trigger}
                active={weekdayTooltip.tooltipActive}
                position={weekdayTooltipX != null ? { x: weekdayTooltipX } : undefined}
                wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                content={(props) => (
                  <RechartsTooltipContent
                    active={props.active}
                    payload={props.payload as ReadonlyArray<{ payload?: WeekdayActivityPoint }> | undefined}
                    coordinate={props.coordinate}
                    viewBox={readTooltipViewBox(props)}
                    onClaim={weekdayTooltip.claim}
                    onPin={weekdayTooltip.coarse ? weekdayTooltip.pin : undefined}
                    onRelease={weekdayTooltip.coarse ? weekdayTooltip.dismiss : undefined}
                    suppressed={weekdayTooltip.suppressed}
                    onTranslateX={setWeekdayTooltipX}
                    renderTooltip={(point) => (
                      <ChartTooltip
                        title={format.weekday(point.weekday)}
                        rows={statsTooltipRows(t, format, point)}
                      />
                    )}
                  />
                )}
              />
              <Bar
                dataKey={metric}
                fill={color}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                activeBar={barActiveProps(color)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
