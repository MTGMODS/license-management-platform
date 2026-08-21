import { useTranslation } from 'react-i18next'
import {
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
import type { LicenseDurationStat, LicensePaymentStat } from '@/shared/api/license'
import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'
import { Card, ErrorState, Skeleton } from '@/shared/ui'
import { AXIS_PROPS, barActiveProps, CHART, Y_AXIS_NUMERIC } from '@/widgets/analytics/chartTheme'
import { ChartTooltip } from '@/widgets/analytics/ChartTooltip'

const PAYMENT_FALLBACK = ['#0fb0fa', '#34d399', '#f59e0b', '#fb7185', '#38bdf8']

const PAYMENT_COLOR: Record<string, string> = {
  FunPay: '#0fb0fa',
  Stars: '#34d399',
  Card: '#f59e0b',
  Crypto: '#fb7185',
  PayPal: '#38bdf8',
  Promo: '#a78bfa',
}

function paymentColor(method: string, index: number): string {
  return PAYMENT_COLOR[method] ?? PAYMENT_FALLBACK[index % PAYMENT_FALLBACK.length] ?? '#0fb0fa'
}

function money(format: ReturnType<typeof useFormatters>, value: number): string {
  return `$${format.number(value)}`
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
                          value: money(format, point.sum),
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

function PaymentsChart({ payments }: { payments: LicensePaymentStat[] }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const total = payments.reduce((sum, item) => sum + item.sum, 0)

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('stats.payments.title')}</h3>

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
                            value: money(format, point.sum),
                          },
                        ]}
                      />
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="tabular text-2xl font-semibold tracking-tight">{money(format, total)}</p>
              <p className="mt-0.5 text-xs text-fg-subtle">{t('stats.payments.total')}</p>
            </div>
          </div>

          <ul className="space-y-3">
            {payments.map((item, index) => (
              <li key={item.method} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: paymentColor(item.method, index) }}
                />
                <span className="min-w-0 flex-1 truncate text-fg-muted">{item.method}</span>
                <span className="tabular font-medium">{money(format, item.sum)}</span>
                <span className="tabular w-14 text-right text-fg-subtle">
                  {total > 0 ? format.percent((item.sum / total) * 100) : '—'}
                </span>
              </li>
            ))}
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
  const total = rows.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('stats.top.title')}</h3>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('stats.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-5">
          {rows.map((item) => {
            const share = total > 0 ? (item.count / total) * 100 : 0
            return (
              <li key={item.days}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {t('stats.top.product', { plan: t('pricing.days', { count: item.days }) })}
                  </span>
                  <span className="tabular text-fg-subtle">
                    {format.number(item.count)} · {format.percent(share)}
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

export function SalesStats() {
  const { t } = useTranslation('vip')
  const format = useFormatters()
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

  const { new_subs: subs, old_forever: legacy } = data
  const hasSide = legacy.total_sold > 0 || subs.free_issued > 0

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('stats.detailsTitle')}</h2>
      <p className="mt-2 text-fg-muted">{t('stats.detailsSubtitle')}</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <DurationsChart durations={subs.top_durations} />
        <PaymentsChart payments={subs.top_payments} />
      </div>

      <div className={cn('mt-4 grid gap-4', hasSide ? 'lg:grid-cols-2' : null)}>
        <TopDurations durations={subs.top_durations} />

        {legacy.total_sold > 0 || subs.free_issued > 0 ? (
          <div className="space-y-4">
            {legacy.total_sold > 0 ? (
              <Card className="p-6">
                <h3 className="text-lg font-semibold tracking-tight">{t('stats.legacy.title')}</h3>
                <p className="mt-1 text-sm text-fg-muted">{t('stats.legacy.subtitle')}</p>
                <div className="mt-4 flex flex-wrap gap-8">
                  <div>
                    <p className="tabular text-2xl font-semibold">{format.number(legacy.total_sold)}</p>
                    <p className="mt-1 text-sm text-fg-subtle">{t('stats.legacy.sold')}</p>
                  </div>
                  <div>
                    <p className="tabular text-2xl font-semibold">{money(format, legacy.total_money)}</p>
                    <p className="mt-1 text-sm text-fg-subtle">{t('stats.legacy.money')}</p>
                  </div>
                </div>
              </Card>
            ) : null}
            {subs.free_issued > 0 ? (
              <Card className="p-6">
                <h3 className="text-lg font-semibold tracking-tight">{t('stats.free.title')}</h3>
                <div className="mt-4 flex flex-wrap gap-8">
                  <div>
                    <p className="tabular text-2xl font-semibold">{format.number(subs.free_issued)}</p>
                    <p className="mt-1 text-sm text-fg-subtle">{t('stats.free.issued')}</p>
                  </div>
                  <div>
                    <p className="tabular text-2xl font-semibold">{format.number(subs.free_active)}</p>
                    <p className="mt-1 text-sm text-fg-subtle">{t('stats.free.active')}</p>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
