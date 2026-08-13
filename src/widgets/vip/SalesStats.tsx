import { CreditCard, Crown, Wallet } from 'lucide-react'
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
import { useFormatters } from '@/shared/lib/format'
import { Card, ErrorState, Skeleton } from '@/shared/ui'
import { AXIS_PROPS, barActiveProps, CHART, Y_AXIS_NUMERIC } from '@/widgets/analytics/chartTheme'
import { ChartTooltip } from '@/widgets/analytics/ChartTooltip'

/** Distinct hues for the payment split; the chart is a true part-of-whole. */
const PAYMENT_COLORS = ['#7c5cff', '#34d399', '#fbbf24', '#fb7185', '#38bdf8']

function DurationsChart({ durations }: { durations: LicenseDurationStat[] }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()

  const rows = [...durations]
    .sort((a, b) => a.days - b.days)
    .map((item) => ({ ...item, label: t('pricing.days', { count: item.days }) }))

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('stats.durations.title')}</h3>
      <p className="mt-1 text-sm text-fg-muted">{t('stats.durations.subtitle')}</p>

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
                          value: `$${format.number(point.sum)}`,
                        },
                      ]}
                    />
                  )
                }}
              />
              <Bar
                dataKey="count"
                fill={CHART.users}
                radius={[4, 4, 0, 0]}
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
      <p className="mt-1 text-sm text-fg-muted">{t('stats.payments.subtitle')}</p>

      {payments.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('stats.empty')}</p>
      ) : (
        <>
          <div className="mt-6 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={payments}
                  dataKey="sum"
                  nameKey="method"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {payments.map((item, index) => (
                    <Cell key={item.method} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
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
                            value: `$${format.number(point.sum)}`,
                          },
                        ]}
                      />
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-4 space-y-2">
            {payments.map((item, index) => (
              <li key={item.method} className="flex items-center gap-2.5 text-sm">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }}
                />
                <span className="text-fg-muted">{item.method}</span>
                <span className="tabular ml-auto font-medium">
                  {total > 0 ? format.percent((item.sum / total) * 100) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </>
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
        <h2 className="text-2xl font-semibold tracking-tight">{t('stats.title')}</h2>
        <div className="mt-6 space-y-4">
          <Skeleton className="h-28" label={t('stats.loading')} />
          <Skeleton className="h-64" />
        </div>
      </section>
    )
  }

  if (isError || !data) {
    return (
      <section>
        <h2 className="text-2xl font-semibold tracking-tight">{t('stats.title')}</h2>
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

  const headline = [
    { id: 'sold', label: t('stats.totalSold'), value: format.number(subs.total_vips), icon: Crown },
    {
      id: 'active',
      label: t('stats.activeNow'),
      value: format.number(subs.active_total),
      icon: CreditCard,
    },
    {
      id: 'money',
      label: t('stats.totalMoney'),
      value: `$${format.number(subs.total_money)}`,
      icon: Wallet,
    },
  ]

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">{t('stats.title')}</h2>
      <p className="mt-2 text-fg-muted">{t('stats.subtitle')}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {headline.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.id} className="p-5">
              <Icon aria-hidden className="size-5 text-accent-300" />
              <p className="tabular mt-4 text-3xl font-semibold tracking-tight">{item.value}</p>
              <p className="mt-1 text-sm text-fg-subtle">{item.label}</p>
            </Card>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DurationsChart durations={subs.top_durations} />
        <PaymentsChart payments={subs.top_payments} />
      </div>

      {/* Both blocks below are zero on a fresh install, and an empty card reads
          as a bug rather than as "none yet", so they only appear with data. */}
      {legacy.total_sold > 0 ? (
        <Card className="mt-4 p-6">
          <h3 className="text-lg font-semibold tracking-tight">{t('stats.legacy.title')}</h3>
          <p className="mt-1 text-sm text-fg-muted">{t('stats.legacy.subtitle')}</p>
          <div className="mt-4 flex flex-wrap gap-8">
            <div>
              <p className="tabular text-2xl font-semibold">{format.number(legacy.total_sold)}</p>
              <p className="mt-1 text-sm text-fg-subtle">{t('stats.legacy.sold')}</p>
            </div>
            <div>
              <p className="tabular text-2xl font-semibold">${format.number(legacy.total_money)}</p>
              <p className="mt-1 text-sm text-fg-subtle">{t('stats.legacy.money')}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {subs.free_issued > 0 ? (
        <Card className="mt-4 p-6">
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

      <p className="mt-4 text-sm text-fg-subtle">
        {t('stats.updated', { time: format.dateTime(data.updated_at) })}
      </p>
    </section>
  )
}
