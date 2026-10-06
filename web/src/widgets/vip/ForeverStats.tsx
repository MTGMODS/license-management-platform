import { useTranslation } from 'react-i18next'

import type { LicenseForeverStats, LicensePriceStat } from '@/shared/api/license'
import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'
import { Card } from '@/shared/ui'

import { MetricCard, PaymentsChart } from './SalesStatCards'
import { usd, usdWhole } from './salesStatsFormat'

function ForeverPricesChart({ prices }: { prices: LicensePriceStat[] }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const rows = [...prices].sort((a, b) => a.price - b.price)

  return (
    <Card className="flex h-full flex-col p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('stats.legacy.byPrice.title')}</h3>
      <p className="mt-1 text-sm text-fg-muted">{t('stats.legacy.byPrice.subtitle')}</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('stats.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((item) => {
            const share = item.count_share
            return (
              <li key={item.price}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {t('stats.legacy.byPrice.price', { price: usdWhole(format, item.price) })}
                  </span>
                  <span className="tabular text-sm">
                    <span className="font-medium text-fg">{format.number(item.count)}</span>
                    <span className="text-fg-subtle"> · </span>
                    <span className="font-medium text-fg">{usdWhole(format, item.sum)}</span>
                    <span className="text-fg-subtle"> · {format.percent(share)}</span>
                  </span>
                </div>
                <div className="mt-1 text-xs text-fg-subtle">
                  {t('stats.durations.moneyShare')}: {format.percent(item.money_share)}
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

export function ForeverStats({ forever }: { forever: LicenseForeverStats }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const { overview: o } = forever

  const hasPrice = forever.by_price.length > 0
  const hasMethods = forever.by_method.length > 0

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'grid gap-4',
          hasPrice && 'lg:grid-cols-2 lg:items-stretch',
        )}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <MetricCard dense label={t('stats.legacy.sold')} value={format.number(o.paid_sold)} />
            <MetricCard dense label={t('stats.legacy.money')} value={usdWhole(format, o.total_money)} />
            <MetricCard dense label={t('stats.overview.avgCheck')} value={usd(format, o.avg_check)} />
          </div>

          {hasMethods ? (
            <PaymentsChart
              payments={forever.by_method}
              title={t('stats.legacy.payments')}
              subtitle={t('stats.legacy.paymentsHint')}
              layout="inline"
            />
          ) : null}
        </div>

        {hasPrice ? <ForeverPricesChart prices={forever.by_price} /> : null}
      </div>
    </div>
  )
}
