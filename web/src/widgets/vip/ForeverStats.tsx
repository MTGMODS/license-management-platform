import { BadgeDollarSign, CircleDollarSign, ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { LicenseOldSalesStats, LicensePriceStat } from '@/shared/api/license'
import { useFormatters } from '@/shared/lib/format'
import { Card } from '@/shared/ui'

import { foreverPricePeriods } from './foreverPricePeriods'
import { PaymentsChart } from './SalesStatCards'
import { usd, usdWhole } from './salesStatsFormat'

function ForeverPricesChart({ prices }: { prices: LicensePriceStat[] }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const allPrices = [...new Set([
    ...foreverPricePeriods.map((period) => period.price),
    ...prices.map((item) => item.price),
  ])].sort((a, b) => a - b)

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold tracking-tight">{t('stats.legacy.byPrice.title')}</h2>
      <p className="mt-1 text-sm text-fg-muted">{t('stats.legacy.priceHistory.subtitle')}</p>
      <ul className="mt-6 space-y-5">
        {allPrices.map((price) => {
          const item = prices.find((row) => row.price === price)
          const period = foreverPricePeriods.find((row) => row.price === price)
          const share = item?.count_share ?? 0
          return (
            <li key={price}>
              <div className="flex items-start gap-3">
                <span className="tabular flex w-14 shrink-0 justify-center rounded-lg bg-accent-500/10 py-2 font-semibold text-accent-500">
                  {Number.isInteger(price) ? usdWhole(format, price) : usd(format, price)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-fg-muted sm:text-sm">
                    {period ? (
                      <>
                        <time dateTime={period.start}>{format.fullDate(period.start)}</time>
                        {' — '}
                        <time dateTime={period.end}>{format.fullDate(period.end)}</time>
                      </>
                    ) : t('stats.legacy.priceHistory.unknownPeriod')}
                  </div>
                  <div className="tabular mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-subtle">
                    <span>{t('stats.legacy.byPrice.sales', { value: format.number(item?.count ?? 0) })}</span>
                    <span>{usdWhole(format, item?.sum ?? 0)}</span>
                    <span>{t('stats.legacy.byPrice.share', { share: format.percent(share) })}</span>
                  </div>
                </div>
              </div>
              <div className="mt-1 text-xs text-fg-subtle">
                {t('stats.durations.moneyShare')}: {format.percent(item?.money_share ?? 0)}
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
      <p className="mt-5 text-xs text-fg-subtle">{t('stats.legacy.priceHistory.boundaries')}</p>
    </Card>
  )
}

export function ForeverStats({ data }: { data: LicenseOldSalesStats }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const { forever, updated_at: updatedAt } = data
  const { overview } = forever
  const metrics = [
    { label: t('stats.sales'), value: format.number(overview.paid_sold), icon: ShoppingCart },
    { label: t('stats.revenue'), value: usdWhole(format, overview.total_money), icon: CircleDollarSign },
    { label: t('stats.overview.avgCheck'), value: usd(format, overview.avg_check), icon: BadgeDollarSign },
  ]

  return (
    <div className="space-y-6">
      <section aria-labelledby="forever-overview-title">
        <h2 id="forever-overview-title" className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t('stats.legacy.overviewTitle')}
        </h2>
        <p className="mt-1 text-sm text-fg-muted">{t('stats.legacy.overviewSubtitle')}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="min-w-0 p-3 text-center sm:p-6">
              <div className="flex items-center justify-center gap-1.5 text-xs text-fg-muted sm:text-sm">
                <Icon aria-hidden className="hidden size-4 shrink-0 text-accent-300 sm:block" />
                <p>{label}</p>
              </div>
              <p className="tabular mt-2 text-lg font-semibold tracking-tight sm:text-3xl">{value}</p>
            </Card>
          ))}
        </div>
        {updatedAt ? (
          <p className="mt-3 text-xs text-fg-subtle sm:text-sm">
            {t('stats.updated', { time: format.dateTime(updatedAt) })}
          </p>
        ) : null}
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <PaymentsChart payments={forever.by_method} title={t('stats.legacy.payments')}
          layout="inline" donutSize="large" />
        <ForeverPricesChart prices={forever.by_price} />
      </div>
    </div>
  )
}
