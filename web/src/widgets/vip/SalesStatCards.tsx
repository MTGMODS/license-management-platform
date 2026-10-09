import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

import type { LicensePaymentStat } from '@/shared/api/license'
import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'
import { Card } from '@/shared/ui'

import { usdWhole } from './salesStatsFormat'

const PAYMENT_FALLBACK = ['#0fb0fa', '#34d399', '#f59e0b', '#fb7185', '#38bdf8', '#a78bfa']

const PAYMENT_COLOR: Record<string, string> = {
  FunPay: '#0fb0fa',
  Stars: '#ffb800',
  Card: '#ef4444',
  Crypto: '#22c55e',
  PayPal: '#1e40af',
  Promo: '#a78bfa',
  Steam: '#a855f7',
  Gift: '#f472b6',
}

function paymentColor(method: string, index: number): string {
  const known = Object.entries(PAYMENT_COLOR).find(
    ([key]) => key.toLowerCase() === method.toLowerCase(),
  )
  return known?.[1] ?? PAYMENT_FALLBACK[index % PAYMENT_FALLBACK.length] ?? '#0fb0fa'
}

export function MetricCard({
  label,
  value,
  hint,
  dense = false,
}: {
  label: string
  value: string
  hint?: string
  dense?: boolean
}) {
  return (
    <Card className={cn('p-4 sm:p-5', dense && 'p-3 sm:p-4')}>
      <p
        className={cn(
          'tabular text-xl font-semibold tracking-tight sm:text-2xl',
          dense && 'text-base sm:text-xl',
        )}
      >
        {value}
      </p>
      <p className={cn('mt-1 text-sm text-fg-muted', dense && 'text-xs sm:text-sm')}>{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p> : null}
    </Card>
  )
}

export function PaymentsChart({
  payments,
  title,
  subtitle,
  layout = 'default',
  donutSize = 'default',
}: {
  payments: LicensePaymentStat[]
  title: string
  subtitle?: string
  layout?: 'default' | 'inline'
  donutSize?: 'default' | 'large'
}) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const totalMoney = payments.reduce((sum, item) => sum + item.sum, 0)
  const inline = layout === 'inline'

  return (
    <Card className="flex h-full flex-col p-6">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-fg-muted">{subtitle}</p> : null}

      {payments.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('stats.empty')}</p>
      ) : (
        <div
          className={cn(
            'mt-5 flex min-h-0 flex-1 gap-4 sm:gap-5',
            inline
              ? 'flex-col items-center gap-5 sm:flex-row sm:items-center'
              : 'flex-col gap-6 sm:flex-row sm:items-stretch',
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-center justify-center',
              inline
                ? 'w-full sm:w-auto'
                : 'min-h-[12rem] sm:min-h-0 sm:basis-[44%] lg:basis-[46%]',
            )}
          >
            <div
              className={cn(
                'relative aspect-square',
                inline
                  ? donutSize === 'large'
                    ? 'h-60 w-60 sm:h-64 sm:w-64'
                    : 'h-52 w-52 sm:h-55 sm:w-55'
                  : 'h-52 w-52 sm:h-full sm:w-auto sm:max-h-full sm:max-w-full sm:scale-[0.9025]',
              )}
            >
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
                    isAnimationActive
                  >
                    {payments.map((item, index) => (
                      <Cell key={item.method} fill={paymentColor(item.method, index)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p
                  className={cn(
                    'tabular font-semibold tracking-tight',
                    inline ? 'text-base sm:text-xl' : 'text-xl sm:text-2xl',
                  )}
                >
                  {usdWhole(format, totalMoney)}
                </p>
                <p
                  className={cn(
                    'mt-0.5 text-fg-subtle',
                    inline ? 'text-[0.65rem] sm:text-sm' : 'text-[0.65rem] sm:text-xs',
                  )}
                >
                  {t('stats.payments.total')}
                </p>
              </div>
            </div>
          </div>

          <ul
            className={cn(
              'flex min-w-0 flex-col',
              inline ? 'w-full gap-3 sm:min-w-0 sm:flex-1 sm:gap-3' : 'flex-1 justify-center gap-3.5',
            )}
          >
            {payments.map((item, index) => {
              const moneyShare =
                item.money_share || (totalMoney > 0 ? (item.sum / totalMoney) * 100 : 0)
              return (
                <li key={item.method} className="flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: paymentColor(item.method, index) }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg-muted">{item.method}</p>
                      <p className="tabular text-xs text-fg-subtle">
                        {format.number(item.count)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 tabular text-sm font-medium">
                    {usdWhole(format, item.sum)}
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
