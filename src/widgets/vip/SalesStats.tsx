import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
  LicenseDurationStat,
  LicenseForeverStats,
  LicensePaymentStat,
  LicensePurchaseBucket,
  LicenseRetentionStats,
  LicenseSaleRow,
  LicenseTimelineDay,
  LicenseTimelineMonth,
} from '@/shared/api/license'
import { useFormatters } from '@/shared/lib/format'
import { Card, ErrorState, SegmentedControl, Skeleton } from '@/shared/ui'
import { AXIS_PROPS, barActiveProps, CHART, Y_AXIS_NUMERIC } from '@/widgets/analytics/chartTheme'
import { ChartTooltip } from '@/widgets/analytics/ChartTooltip'

const PAYMENT_FALLBACK = ['#0fb0fa', '#34d399', '#f59e0b', '#fb7185', '#38bdf8', '#a78bfa']

const PAYMENT_COLOR: Record<string, string> = {
  FunPay: '#0fb0fa',
  Stars: '#34d399',
  Card: '#f59e0b',
  Crypto: '#fb7185',
  PayPal: '#38bdf8',
  Promo: '#a78bfa',
  Steam: '#67e8f9',
  Gift: '#f472b6',
}

const RECENT_SALES_LIMIT = 25

type TimelineGrain = 'daily' | 'monthly'

function paymentColor(method: string, index: number): string {
  return PAYMENT_COLOR[method] ?? PAYMENT_FALLBACK[index % PAYMENT_FALLBACK.length] ?? '#0fb0fa'
}

function usd(format: ReturnType<typeof useFormatters>, value: number): string {
  return `$${format.money(value)}`
}

function usdWhole(format: ReturnType<typeof useFormatters>, value: number): string {
  return `$${format.number(value)}`
}

/** Prefer activation time as the purchase clock for display. */
function saleDate(row: LicenseSaleRow): string | null {
  return row.activated_at ?? row.purchased_at
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="tabular text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
      <p className="mt-1 text-sm text-fg-muted">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p> : null}
    </Card>
  )
}

function RevenueTimeline({
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
        label: format.dayMonth(point.date),
        count: point.count,
        sum: point.sum,
      }))
    }
    return monthly.map((point) => ({
      key: point.month,
      label: point.month,
      count: point.count,
      sum: point.sum,
    }))
  }, [daily, format, grain, monthly])

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
                dataKey="label"
                {...AXIS_PROPS}
                interval={grain === 'daily' ? 'preserveStartEnd' : 0}
                minTickGap={grain === 'daily' ? 28 : 12}
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

function DurationsChart({ durations }: { durations: LicenseDurationStat[] }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()

  const rows = [...durations]
    .sort((a, b) => a.days - b.days)
    .map((item) => ({ ...item, label: t('pricing.days', { count: item.days }) }))

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('stats.durations.title')}</h3>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('stats.empty')}</p>
      ) : (
        <div className="mt-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis {...Y_AXIS_NUMERIC} allowDecimals={false} />
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
                          label: t('stats.durations.count'),
                          value: format.number(point.count),
                          color: CHART.users,
                        },
                        {
                          label: t('stats.durations.active'),
                          value: format.number(point.active),
                        },
                        {
                          label: t('stats.durations.sum'),
                          value: usdWhole(format, point.sum),
                        },
                        {
                          label: t('stats.durations.countShare'),
                          value: format.percent(point.count_share),
                        },
                        {
                          label: t('stats.durations.moneyShare'),
                          value: format.percent(point.money_share),
                        },
                      ]}
                    />
                  )
                }}
              />
              <Bar
                dataKey="count"
                fill={CHART.users}
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
                activeBar={barActiveProps(CHART.users)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function PaymentsChart({
  payments,
  title,
  subtitle,
}: {
  payments: LicensePaymentStat[]
  title: string
  subtitle?: string
}) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const totalMoney = payments.reduce((sum, item) => sum + item.sum, 0)
  const totalCount = payments.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-fg-muted">{subtitle}</p> : null}

      {payments.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('stats.empty')}</p>
      ) : (
        <div className="mt-4 grid items-center gap-6 lg:grid-cols-2">
          <div className="relative mx-auto h-56 w-full max-w-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={payments}
                  dataKey="sum"
                  nameKey="method"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {payments.map((item, index) => (
                    <Cell key={item.method} fill={paymentColor(item.method, index)} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as LicensePaymentStat | undefined
                    if (!active || !point) return null
                    const countShare =
                      point.count_share ||
                      (totalCount > 0 ? (point.count / totalCount) * 100 : 0)
                    const moneyShare =
                      point.money_share ||
                      (totalMoney > 0 ? (point.sum / totalMoney) * 100 : 0)

                    return (
                      <ChartTooltip
                        title={point.method}
                        rows={[
                          {
                            label: t('stats.payments.count'),
                            value: format.number(point.count),
                          },
                          {
                            label: t('stats.payments.sum'),
                            value: usdWhole(format, point.sum),
                          },
                          {
                            label: t('stats.payments.countShare'),
                            value: format.percent(countShare),
                          },
                          {
                            label: t('stats.payments.moneyShare'),
                            value: format.percent(moneyShare),
                          },
                        ]}
                      />
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="tabular text-2xl font-semibold tracking-tight">
                {usdWhole(format, totalMoney)}
              </p>
              <p className="mt-0.5 text-xs text-fg-subtle">{t('stats.payments.total')}</p>
            </div>
          </div>

          <ul className="space-y-3">
            {payments.map((item, index) => {
              const moneyShare =
                item.money_share || (totalMoney > 0 ? (item.sum / totalMoney) * 100 : 0)
              return (
                <li key={item.method} className="flex items-center gap-3 text-sm">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: paymentColor(item.method, index) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-fg-muted">{item.method}</span>
                  <span className="tabular font-medium">{usdWhole(format, item.sum)}</span>
                  <span className="tabular w-14 text-right text-fg-subtle">
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

function TopDurations({ durations }: { durations: LicenseDurationStat[] }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const rows = [...durations].sort((a, b) => b.count - a.count)

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('stats.top.title')}</h3>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('stats.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-5">
          {rows.map((item) => {
            const share = item.count_share
            return (
              <li key={item.days}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {t('stats.top.product', { plan: t('pricing.days', { count: item.days }) })}
                  </span>
                  <span className="tabular text-fg-subtle">
                    {format.number(item.count)} · {format.percent(share)} · {usdWhole(format, item.sum)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-fg-subtle">
                  <span>
                    {t('stats.durations.active')}: {format.number(item.active)}
                  </span>
                  <span>
                    {t('stats.durations.moneyShare')}: {format.percent(item.money_share)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="h-full rounded-full bg-accent-500"
                    style={{ width: `${Math.max(share, share > 0 ? 1.5 : 0)}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function RetentionBlock({ retention }: { retention: LicenseRetentionStats }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const buckets = [...retention.by_purchases].sort((a, b) => a.purchases - b.purchases)

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('stats.retention.title')}</h3>
      <p className="mt-1 text-sm text-fg-muted">{t('stats.retention.subtitle')}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="tabular text-2xl font-semibold">{format.number(retention.buyers)}</p>
          <p className="mt-1 text-sm text-fg-subtle">{t('stats.retention.buyers')}</p>
        </div>
        <div>
          <p className="tabular text-2xl font-semibold">{format.number(retention.repeat_buyers)}</p>
          <p className="mt-1 text-sm text-fg-subtle">{t('stats.retention.repeatBuyers')}</p>
        </div>
        <div>
          <p className="tabular text-2xl font-semibold">{format.percent(retention.repeat_rate)}</p>
          <p className="mt-1 text-sm text-fg-subtle">{t('stats.retention.repeatRate')}</p>
        </div>
        <div>
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
                  {bucket.purchases === 1
                    ? t('stats.retention.once')
                    : t('stats.retention.times', { count: bucket.purchases })}
                </span>
                <span className="tabular text-fg-subtle">
                  {format.number(bucket.users)} · {format.percent(bucket.share)} ·{' '}
                  {usdWhole(format, bucket.sum)}
                </span>
              </div>
              {bucket.renewals > 0 ? (
                <p className="mt-0.5 text-xs text-fg-subtle">
                  {t('stats.retention.renewals', { count: bucket.renewals })}
                </p>
              ) : null}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-aqua-400"
                  style={{ width: `${Math.max(bucket.share, bucket.share > 0 ? 1.5 : 0)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function SalesTable({ sales }: { sales: LicenseSaleRow[] }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()

  const rows = useMemo(
    () =>
      [...sales]
        .sort((a, b) => {
          const left = saleDate(a) ?? ''
          const right = saleDate(b) ?? ''
          return right.localeCompare(left)
        })
        .slice(0, RECENT_SALES_LIMIT),
    [sales],
  )

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('stats.salesList.title')}</h3>
      <p className="mt-1 text-sm text-fg-muted">{t('stats.salesList.subtitle')}</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('stats.empty')}</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 text-fg-subtle">
                <th className="py-2 pr-3 font-medium">{t('stats.salesList.date')}</th>
                <th className="py-2 pr-3 font-medium">{t('stats.salesList.plan')}</th>
                <th className="py-2 pr-3 font-medium">{t('stats.salesList.method')}</th>
                <th className="py-2 pr-3 font-medium">{t('stats.salesList.amount')}</th>
                <th className="py-2 font-medium">{t('stats.salesList.status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const when = saleDate(row)
                return (
                  <tr key={`${when ?? 'x'}-${row.method}-${index}`} className="border-b border-white/5">
                    <td className="py-2.5 pr-3 tabular text-fg-muted">
                      {when ? format.dateTime(when) : '—'}
                    </td>
                    <td className="py-2.5 pr-3">
                      {row.duration_days == null
                        ? '—'
                        : t('pricing.days', { count: row.duration_days })}
                    </td>
                    <td className="py-2.5 pr-3 text-fg-muted">{row.method}</td>
                    <td className="py-2.5 pr-3 tabular font-medium">{usdWhole(format, row.amount)}</td>
                    <td className="py-2.5 text-fg-subtle">{row.status}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {sales.length > RECENT_SALES_LIMIT ? (
            <p className="mt-3 text-xs text-fg-subtle">
              {t('stats.salesList.showing', {
                shown: RECENT_SALES_LIMIT,
                total: sales.length,
              })}
            </p>
          ) : null}
        </div>
      )}
    </Card>
  )
}

function ForeverSection({ forever }: { forever: LicenseForeverStats }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const { overview: o } = forever

  if (o.paid_sold <= 0 && forever.by_method.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{t('stats.legacy.title')}</h3>
        <p className="mt-1 text-sm text-fg-muted">{t('stats.legacy.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label={t('stats.legacy.sold')} value={format.number(o.paid_sold)} />
        <MetricCard label={t('stats.legacy.money')} value={usdWhole(format, o.total_money)} />
        <MetricCard label={t('stats.legacy.active')} value={format.number(o.active)} />
        <MetricCard label={t('stats.overview.avgCheck')} value={usd(format, o.avg_check)} />
      </div>

      <PaymentsChart
        payments={forever.by_method}
        title={t('stats.legacy.payments')}
        subtitle={t('stats.legacy.paymentsHint')}
      />
    </div>
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

  const { subscriptions: subs, forever } = data

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('stats.detailsTitle')}</h2>
      <p className="mt-2 text-fg-muted">{t('stats.detailsSubtitle')}</p>

      <div className="mt-8 space-y-4">
        <RevenueTimeline daily={subs.timeline.daily} monthly={subs.timeline.monthly} />

        <div className="grid gap-4 lg:grid-cols-2">
          <DurationsChart durations={subs.by_duration} />
          <PaymentsChart payments={subs.by_method} title={t('stats.payments.title')} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TopDurations durations={subs.by_duration} />
          <RetentionBlock retention={subs.retention} />
        </div>

        <SalesTable sales={subs.sales} />

        {forever.overview.paid_sold > 0 || forever.by_method.length > 0 ? (
          <div className="border-t border-white/8 pt-8">
            <ForeverSection forever={forever} />
          </div>
        ) : null}
      </div>
    </section>
  )
}
