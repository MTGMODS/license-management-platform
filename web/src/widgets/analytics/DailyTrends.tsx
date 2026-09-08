import { useMemo, useState } from 'react'
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
import { Card } from '@/shared/ui'

import { AXIS_PROPS, CHART, type ChartMetric, chartColor, Y_AXIS_NUMERIC } from './chartTheme'
import { CHART_TOOLTIP_WRAPPER_STYLE, readTooltipViewBox } from './chartTooltipPosition'
import { ChartTooltip } from './ChartTooltip'
import { RechartsTooltipContent } from './RechartsTooltipContent'
import { statsTooltipRows } from './statsTooltip'
import { useExclusiveAnalyticsTooltip } from './useExclusiveAnalyticsTooltip'

interface TrendPoint {
  key: string
  users: number
  vip_users: number
  launches: number
  launches_per_user: number
}

/** UTC calendar day matching the backend daily buckets (`YYYY-MM-DD`). */
function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function DailyTrends({ daily, metric }: { daily: DailyPoint[]; metric: ChartMetric }) {
  const { t } = useTranslation('helper')
  const format = useFormatters()

  const points = useMemo<TrendPoint[]>(() => {
    const today = utcToday()
    return daily
      .filter((point) => point.date !== today)
      .map((point) => ({
        key: point.date,
        users: point.users,
        vip_users: point.vip_users,
        launches: point.launches,
        launches_per_user: point.launches_per_user,
      }))
  }, [daily])

  const color = chartColor(metric)
  const gradientId = `timeline-daily-${metric}`
  const [tooltipX, setTooltipX] = useState<number | undefined>()
  const tooltip = useExclusiveAnalyticsTooltip()

  return (
    <Card className="p-4 text-left sm:p-6">
      <div className="min-w-0">
        <h3 className="text-lg font-semibold tracking-tight">{t('analytics.daily.title')}</h3>
        <p className="mt-1 text-sm text-fg-muted">{t('analytics.daily.subtitle')}</p>
      </div>

      {points.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('analytics.empty')}</p>
      ) : (
        <div className="mt-6 h-72" ref={tooltip.surfaceRef} {...tooltip.surfaceProps}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart accessibilityLayer={false} data={points} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="key" {...AXIS_PROPS} tickFormatter={format.dayMonth} minTickGap={28} />
              <YAxis {...Y_AXIS_NUMERIC} tickFormatter={format.compact} />
              <Tooltip
                cursor={{ stroke: CHART.axis, strokeDasharray: '4 4' }}
                offset={8}
                trigger={tooltip.trigger}
                active={tooltip.tooltipActive}
                position={tooltipX != null ? { x: tooltipX } : undefined}
                wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                content={(props) => (
                  <RechartsTooltipContent
                    active={props.active}
                    payload={props.payload as ReadonlyArray<{ payload?: TrendPoint }> | undefined}
                    coordinate={props.coordinate}
                    viewBox={readTooltipViewBox(props)}
                    onClaim={tooltip.claim}
                    onPin={tooltip.coarse ? tooltip.pin : undefined}
                    onRelease={tooltip.coarse ? tooltip.dismiss : undefined}
                    suppressed={tooltip.suppressed}
                    onTranslateX={setTooltipX}
                    renderTooltip={(point) => (
                      <ChartTooltip
                        title={format.fullDate(point.key)}
                        rows={statsTooltipRows(t, format, point)}
                      />
                    )}
                  />
                )}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
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
