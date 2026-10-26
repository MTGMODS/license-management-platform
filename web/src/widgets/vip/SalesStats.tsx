import { CalendarDays, CalendarRange, ChevronDown, Infinity as InfinityIcon, Repeat2 } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useSalesStats } from '@/features/license/useSalesStats'
import type {
  LicensePurchaseBucket,
  LicenseRetentionStats,
  LicenseSaleRow,
  LicenseTimelineDay,
  LicenseTimelineMonth,
} from '@/shared/api/license'
import { isCalendarDate, utcTodayKey } from '@/shared/lib/datetime'
import { useFormatters } from '@/shared/lib/format'
import { Button, Card, ErrorState, SegmentedControl, Skeleton } from '@/shared/ui'
import { CalendarDateInput } from '@/shared/ui/CalendarDateInput'
import { AXIS_PROPS, CHART, Y_AXIS_NUMERIC } from '@/widgets/analytics/chartTheme'
import { ChartTooltip } from '@/widgets/analytics/ChartTooltip'

import { PaymentsChart } from './SalesStatCards'
import { SalesPeriodSummary } from './SalesPeriodSummary'
import { filterSales, groupSales, saleDate, type SalesDurationBucket, type SalesRangeMode } from './salesAnalysis'
import { usdAmount, usdWhole } from './salesStatsFormat'

const DURATION_COLOR: Record<number, string> = {
  7: '#22c55e',
  30: '#0fb0fa',
  90: '#a855f7',
  365: '#ffb800',
}

const DURATION_FALLBACK = ['#34d399', '#f472b6', '#f59e0b', '#fb7185', '#a78bfa']

type TimelineGrain = 'daily' | 'monthly'

function durationColor(days: number, index: number): string {
  return DURATION_COLOR[days] ?? DURATION_FALLBACK[index % DURATION_FALLBACK.length] ?? '#0fb0fa'
}

export function RevenueTimeline({
  daily,
  monthly,
}: {
  daily: LicenseTimelineDay[]
  monthly: LicenseTimelineMonth[]
}) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const [grain, setGrain] = useState<TimelineGrain>('monthly')

  const points = useMemo(() => {
    if (grain === 'daily') {
      return daily.map((point) => ({
        key: point.date,
        axis: format.dayMonth(point.date),
        label: format.fullDate(point.date),
        count: point.count,
        sum: point.sum,
      }))
    }

    let prevYear = ''
    return monthly.map((point) => {
      const year = point.month.slice(0, 4)
      const monthLabel = format.monthShort(point.month)
      /** Year only when it changes — keeps narrow mobile axes readable. */
      const axis =
        year !== prevYear ? `${monthLabel} '${year.slice(2)}` : monthLabel
      prevYear = year
      return {
        key: point.month,
        axis,
        label: format.monthYear(point.month),
        count: point.count,
        sum: point.sum,
      }
    })
  }, [daily, format, grain, monthly])
  const axisLabels = useMemo(
    () => new Map(points.map(({ key, axis }) => [key, axis])),
    [points],
  )

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight">{t('stats.timeline.title')}</h3>
          <p className="mt-1 text-sm text-fg-muted">{t('stats.timeline.subtitle')}</p>
        </div>
        <SegmentedControl
          className="shrink-0 self-start"
          size="sm"
          label={t('stats.timeline.grain')}
          value={grain}
          onChange={setGrain}
          options={[
            { id: 'monthly', label: t('stats.timeline.monthly') },
            { id: 'daily', label: t('stats.timeline.daily') },
          ]}
        />
      </div>

      {points.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('stats.empty')}</p>
      ) : (
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart accessibilityLayer={false} data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="sales-revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.launches} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART.launches} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="key"
                {...AXIS_PROPS}
                interval="preserveStartEnd"
                minTickGap={grain === 'daily' ? 28 : 36}
                tickFormatter={(key: string) => axisLabels.get(key) ?? key}
              />
              <YAxis {...Y_AXIS_NUMERIC} tickFormatter={(value: number) => format.compact(value)} />
              <Tooltip
                cursor={{ stroke: CHART.cursor, strokeWidth: 24 }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as (typeof points)[number] | undefined
                  if (!active || !point) return null
                  return (
                    <ChartTooltip
                      title={point.label}
                      rows={[
                        {
                          label: t('stats.timeline.revenue'),
                          value: usdWhole(format, point.sum),
                          color: CHART.launches,
                        },
                        {
                          label: t('stats.timeline.count'),
                          value: format.number(point.count),
                          color: CHART.users,
                        },
                      ]}
                    />
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="sum"
                stroke={CHART.launches}
                fill="url(#sales-revenue)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function DurationsChart({ durations }: { durations: SalesDurationBucket[] }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const rows = [...durations].sort((a, b) => a.days - b.days)
  const totalMoney = rows.reduce((sum, item) => sum + item.sum, 0)
  const slices = rows.filter(item => item.sum > 0)
  const colors = new Map(rows.map((item, index) => [item.days, durationColor(item.days, index)]))

  return (
    <Card className="flex h-full flex-col p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('stats.durations.title')}</h3>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('stats.periodEmpty')}</p>
      ) : (
        <div className="mt-5 flex min-h-0 flex-1 flex-col gap-6 sm:flex-row sm:items-stretch">
          <div className="flex min-h-[12rem] shrink-0 items-center justify-center sm:min-h-0 sm:basis-[44%] lg:basis-[46%]">
            <div className="relative aspect-square w-52 max-w-full">
              {slices.length === 0 ? <div aria-hidden className="absolute inset-[6%] rounded-full border-[1.65rem] border-ink-700/60" /> : null}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="sum"
                    nameKey="days"
                    innerRadius="62%"
                    outerRadius="88%"
                    paddingAngle={slices.length > 1 ? 2 : 0}
                    stroke="none"
                    isAnimationActive
                  >
                    {slices.map((item) => (
                      <Cell key={item.days} fill={colors.get(item.days)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="tabular text-xl font-semibold tracking-tight text-emerald-400 sm:text-2xl">
                  {usdAmount(format, totalMoney)}
                </p>
                <p className="mt-0.5 text-[0.65rem] text-fg-subtle sm:text-xs">
                  {t('stats.payments.total')}
                </p>
              </div>
            </div>
          </div>

          <ul className="flex min-w-0 flex-1 flex-col justify-center gap-3.5 sm:-ml-2">
            {rows.map((item, index) => {
              const moneyShare =
                item.money_share || (totalMoney > 0 ? (item.sum / totalMoney) * 100 : 0)
              return (
                <li key={item.days} className="flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: durationColor(item.days, index) }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg-muted">
                        {t('pricing.days', { count: item.days })}
                      </p>
                      <p className="tabular text-xs text-fg-subtle">
                        {format.number(item.count)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 tabular text-sm font-medium text-emerald-400">
                    {usdAmount(format, item.sum)}
                  </span>
                  <span className="w-12 shrink-0 tabular text-right text-sm text-fg-subtle">
                    {format.percent(moneyShare)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Card>
  )
}


export function RetentionBlock({ retention }: { retention: LicenseRetentionStats }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const buckets = [...retention.by_purchases].sort((a, b) => a.purchases - b.purchases)
  const transitionDays = [7, 30, 90, 365]
  const transitions = new Map(retention.tariff_transitions.map((row) => [`${row.from_days}-${row.to_days}`, row]))

  return (
    <Card className="border-violet-400/15 bg-gradient-to-br from-violet-400/[0.035] to-transparent p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-400/10 text-violet-300">
          <Repeat2 aria-hidden className="size-4" />
        </span>
        <h3 className="text-lg font-semibold tracking-tight">{t('stats.retention.title')}</h3>
      </div>
      <p className="mt-1 text-sm text-fg-muted">{t('stats.retention.subtitle')}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-accent-400/15 bg-accent-400/5 p-3">
          <p className="tabular text-2xl font-semibold text-accent-300">{format.number(retention.buyers)}</p>
          <p className="mt-1 text-sm text-fg-subtle">{t('stats.retention.buyers')}</p>
        </div>
        <div className="rounded-xl border border-violet-400/15 bg-violet-400/5 p-3">
          <p className="tabular text-2xl font-semibold text-violet-200">{format.number(retention.repeat_buyers)}</p>
          <p className="mt-1 text-sm text-fg-subtle">{t('stats.retention.repeatBuyers')}</p>
        </div>
        <div className="rounded-xl border border-violet-400/15 bg-violet-400/5 p-3">
          <p className="tabular text-2xl font-semibold text-violet-200">{format.percent(retention.repeat_rate)}</p>
          <p className="mt-1 text-sm text-fg-subtle">{t('stats.retention.repeatRate')}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <p className="tabular text-2xl font-semibold">
            {format.decimal(retention.avg_subscriptions_per_buyer)}
          </p>
          <p className="mt-1 text-sm text-fg-subtle">{t('stats.overview.avgPerBuyer')}</p>
        </div>
      </div>

      {buckets.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('stats.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {buckets.map((bucket: LicensePurchaseBucket) => (
            <li key={bucket.purchases}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">
                  {t('stats.retention.purchases', { count: bucket.purchases })}
                </span>
                <span className="tabular text-sm">
                  <span className="font-medium text-accent-300">{format.number(bucket.users)}</span>
                  <span className="text-fg-subtle"> · </span>
                  <span className="font-medium text-emerald-400">{usdWhole(format, bucket.sum)}</span>
                  <span className="text-fg-subtle"> · {format.percent(bucket.share)}</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800">
                <div
                  className={bucket.purchases > 1
                    ? 'h-full rounded-full bg-gradient-to-r from-violet-500/70 to-violet-400/90'
                    : 'h-full rounded-full bg-fg-subtle/50'}
                  style={{ width: `${Math.max(bucket.share, bucket.share > 0 ? 1.5 : 0)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
        <div className="mt-6 border-t border-violet-400/15 pt-5">
          <h4 className="font-semibold">{t('stats.retention.transitionsTitle')}</h4>
          <p className="mt-1 whitespace-pre-line text-sm text-fg-muted">{t('stats.retention.transitionsHint')}</p>
          <div className="mt-5 space-y-5">
            {transitionDays.map((from) => (
              <section key={from} aria-label={t('stats.retention.transitionFrom', { days: t('pricing.days', { count: from }) })}>
                <h5 className="mb-2 text-sm font-medium text-violet-200">
                  {t('stats.retention.transitionFrom', { days: t('pricing.days', { count: from }) })}
                </h5>
                <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  {transitionDays.map((to) => {
                    const row = transitions.get(`${from}-${to}`)
                    const count = row?.count ?? 0
                    return (
                      <li key={to} className={`min-w-0 rounded-xl border p-3 text-sm sm:p-4 ${count > 0
                        ? 'border-violet-400/15 bg-violet-400/[0.04]'
                        : 'border-white/5 bg-white/[0.015]'}`}>
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                          <span>{t('pricing.days', { count: from })}</span>
                          <span className="text-violet-300">→</span>
                          <span>{t('pricing.days', { count: to })}</span>
                        </p>
                        <p className={`mt-3 tabular font-semibold ${count > 0 ? 'text-accent-300' : 'text-fg-subtle'}`}>
                          {t('stats.retention.transitionCount', { count })}
                        </p>
                        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 tabular">
                          <span className="text-xs text-fg-subtle">{format.percent(row?.share ?? 0)}</span>
                          <span className={`font-medium ${count > 0 ? 'text-emerald-400' : 'text-fg-subtle'}`}>
                            {usdAmount(format, row?.sum ?? 0)}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
    </Card>
  )
}

const SALES_PAGE_SIZE = 10

function isSaleActive(status: string): boolean {
  return status.toUpperCase() === 'ACTIVE'
}

export function SalesPeriodBlock({ sales }: { sales: LicenseSaleRow[] }) {
  const { t } = useTranslation('vip')
  const [mode, setMode] = useState<SalesRangeMode>('all')
  const [day, setDay] = useState(() => utcTodayKey())
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const sorted = useMemo(
    () =>
      [...sales].sort((a, b) => {
        const left = saleDate(a) ?? ''
        const right = saleDate(b) ?? ''
        return right.localeCompare(left)
      }),
    [sales],
  )

  const range = useMemo(
    () => mode === 'all' ? { from: '', to: '' } : mode === 'day' ? { from: day, to: day } : { from, to },
    [day, from, mode, to],
  )
  const invalidRange = Boolean(range.from && range.to && range.from > range.to)
  const missingDay = mode === 'day' && !day
  const invalidDate = Boolean((range.from && !isCalendarDate(range.from)) || (range.to && !isCalendarDate(range.to)))
  const rows = useMemo(() => invalidDate ? [] : filterSales(sorted, range), [invalidDate, range, sorted])
  const summaryInput = useMemo(
    () => ({ rows, total: sales.length, mode }),
    [rows, sales.length, mode],
  )
  // Commit the controls and bounded table first. Never show totals from an old filter.
  const deferredSummary = useDeferredValue<typeof summaryInput | null>(summaryInput, null)
  const summaryPending = deferredSummary !== summaryInput
  const breakdown = useMemo(() => deferredSummary ? groupSales(deferredSummary.rows) : null, [deferredSummary])
  const RangeIcon = mode === 'all' ? InfinityIcon : mode === 'day' ? CalendarDays : CalendarRange

  return (
    <section aria-labelledby="sales-period-title" className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 id="sales-period-title" className="text-lg font-semibold tracking-tight">{t('stats.periodTitle')}</h3>
            <p className="mt-1 text-xs text-fg-subtle">{t('stats.periodSubtitle')}</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-auto">
              <RangeIcon aria-hidden className="pointer-events-none absolute left-3 top-2.5 size-4 text-accent-300" />
              <select aria-label={t('stats.salesList.range')} value={mode}
                onChange={event => setMode(event.target.value as SalesRangeMode)}
                className="w-full appearance-none rounded-lg border border-white/10 bg-ink-800 py-2 pl-10 pr-10 text-sm text-fg outline-none focus-visible:border-accent-400/50 focus-visible:ring-2 focus-visible:ring-accent-400/15 sm:w-48 [color-scheme:dark]">
                <option value="all">{t('stats.salesList.allTime')}</option>
                <option value="day">{t('stats.salesList.oneDay')}</option>
                <option value="range">{t('stats.salesList.period')}</option>
              </select>
              <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-3 size-3.5 text-fg-subtle" />
            </div>

            {mode === 'day' ? (
              <CalendarDateInput
                label={t('stats.salesList.oneDay')}
                calendarLabel={t('stats.salesList.calendar', { field: t('stats.salesList.oneDay') })}
                value={day}
                onChange={setDay}
              />
            ) : null}

            {mode === 'range' ? (
              <div className="grid w-full grid-cols-2 gap-2 text-xs text-fg-subtle sm:flex sm:w-auto sm:items-center sm:gap-3">
                <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <span>{t('stats.salesList.from')}</span>
                  <CalendarDateInput
                    label={t('stats.salesList.from')}
                    calendarLabel={t('stats.salesList.calendar', { field: t('stats.salesList.from') })}
                    value={from}
                    max={to || undefined}
                    onChange={setFrom}
                  />
                </span>
                <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <span>{t('stats.salesList.to')}</span>
                  <CalendarDateInput
                    label={t('stats.salesList.to')}
                    calendarLabel={t('stats.salesList.calendar', { field: t('stats.salesList.to') })}
                    value={to}
                    min={from || undefined}
                    onChange={setTo}
                  />
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {invalidRange || missingDay || invalidDate ? (
        <p role="alert" className="text-sm text-negative">
          {t(invalidDate ? 'stats.salesList.invalidDate' : missingDay ? 'stats.salesList.chooseDay' : 'stats.salesList.invalidRange')}
        </p>
      ) : (
        <>
          {summaryPending || !deferredSummary ? (
              <div role="status" aria-label={t('stats.salesList.summaryLoading')} aria-busy="true"
                className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
              </div>
            ) : <SalesPeriodSummary {...deferredSummary} />}

          {summaryPending || !breakdown ? (
            <div role="status" aria-label={t('stats.salesList.chartsLoading')} aria-busy="true" className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
              <PaymentsChart payments={breakdown.payments} title={t('stats.payments.title')} emptyMessage={t('stats.periodEmpty')} preciseMoney />
              <DurationsChart durations={breakdown.durations} />
            </div>
          )}

          <SalesTable key={`${mode}:${day}:${from}:${to}`} rows={rows} mode={mode} />
        </>
      )}
    </section>
  )
}

export function SalesTable({ rows, mode }: { rows: LicenseSaleRow[]; mode: SalesRangeMode }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(rows.length / SALES_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageStart = currentPage * SALES_PAGE_SIZE
  const visibleRows = rows.slice(pageStart, pageStart + SALES_PAGE_SIZE)

  return (
    <Card className="p-4 sm:p-6">
      <h4 className="text-lg font-semibold tracking-tight">{t('stats.salesList.title', { context: mode })}</h4>
      <p className="mt-1 text-sm text-fg-muted">{t('stats.salesList.subtitle')}</p>
      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('stats.salesList.emptyFilter', { context: mode })}</p>
      ) : (
        <div className="mt-3 max-h-[36rem] overflow-auto rounded-xl border border-white/5" key={currentPage}>
          <table aria-label={t('stats.salesList.title', { context: mode })} className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-ink-850/95 backdrop-blur-sm">
              <tr className="border-b border-white/8 text-fg-subtle">
                <th className="px-3 py-2.5 text-center font-medium sm:px-4">
                  {t('stats.salesList.status')}
                </th>
                <th className="px-3 py-2.5 font-medium sm:px-4">{t('stats.salesList.plan')}</th>
                <th className="px-3 py-2.5 font-medium sm:px-4">{t('stats.salesList.amount')}</th>
                <th className="px-3 py-2.5 font-medium sm:px-4">{t('stats.salesList.method')}</th>
                <th className="px-3 py-2.5 font-medium sm:px-4">{t('stats.salesList.date')}</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium sm:px-4">{t('stats.salesList.purchaseType')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => {
                const when = saleDate(row)
                const active = isSaleActive(row.status)
                return (
                  <tr
                    key={`${when ?? 'x'}-${row.method}-${row.amount}-${index}`}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-3 py-2.5 text-center sm:px-4">
                      <span className="inline-flex items-center justify-center" title={row.status}>
                        <span
                          aria-label={row.status}
                          className={
                            active
                              ? 'size-2.5 rounded-full bg-positive'
                              : 'size-2.5 rounded-full bg-negative'
                          }
                        />
                      </span>
                    </td>
                    <td className="px-3 py-2.5 sm:px-4">
                      {row.duration_days == null
                        ? '—'
                        : t('pricing.days', { count: row.duration_days })}
                    </td>
                    <td className="px-3 py-2.5 tabular font-medium sm:px-4">
                      {usdAmount(format, row.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-fg-muted sm:px-4">{row.method}</td>
                    <td className="px-3 py-2.5 text-xs leading-snug tabular text-fg-muted sm:px-4 sm:text-sm">
                      {when ? format.dateTimeWithUtc(when) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 sm:px-4">
                      {row.purchase_kind ? (
                        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${row.purchase_kind === 'first'
                          ? 'bg-accent-400/10 text-accent-300' : 'bg-violet-400/10 text-violet-300'}`}>
                          {t(row.purchase_kind === 'first' ? 'stats.salesList.newPurchase' : 'stats.salesList.renewal')}
                        </span>
                      ) : <span className="text-fg-subtle">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {pageCount > 1 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="tabular text-xs text-fg-subtle">{t('stats.salesList.pageSummary', {
            from: format.number(pageStart + 1), to: format.number(Math.min(pageStart + SALES_PAGE_SIZE, rows.length)),
            total: format.number(rows.length),
          })}</p>
          <div role="group" aria-label={t('stats.salesList.pagination')} className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              {t('stats.salesList.previousPage')}
            </Button>
            <Button size="sm" variant="secondary" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}>
              {t('stats.salesList.nextPage')}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

export function SalesStats() {
  const { t } = useTranslation('vip')
  const { data, isPending, isError, refetch, isFetching } = useSalesStats()

  if (isPending) {
    return (
      <section>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('stats.detailsTitle')}</h2>
        <p className="mt-2 text-fg-muted">{t('stats.detailsSubtitle')}</p>
        <Skeleton className="mt-8 h-80" label={t('stats.loading')} />
        <Skeleton className="mt-4 h-64" />
      </section>
    )
  }

  if (isError || !data) {
    return (
      <section>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('stats.detailsTitle')}</h2>
        <Card className="mt-6 p-5">
          <ErrorState
            compact
            description={t('stats.error')}
            retrying={isFetching}
            onRetry={() => void refetch()}
          />
        </Card>
      </section>
    )
  }

  const { subscriptions: subs } = data

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('stats.detailsTitle')}</h2>
      <p className="mt-2 text-fg-muted">{t('stats.detailsSubtitle')}</p>

      <div className="mt-8 space-y-4">
        <SalesPeriodBlock sales={subs.sales} />
        <section aria-labelledby="sales-history-title" className="space-y-4 border-t border-white/8 pt-8 sm:pt-10">
          <div>
            <h3 id="sales-history-title" className="text-xl font-semibold tracking-tight sm:text-2xl">{t('stats.historyTitle')}</h3>
            <p className="mt-2 text-sm text-fg-muted">{t('stats.historySubtitle')}</p>
          </div>
          <RevenueTimeline daily={subs.timeline.daily} monthly={subs.timeline.monthly} />
          <RetentionBlock retention={subs.retention} />
        </section>
      </div>
    </section>
  )
}
