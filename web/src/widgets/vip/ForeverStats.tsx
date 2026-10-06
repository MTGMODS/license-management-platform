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
      <div aria-hidden="true" className="mt-6 hidden grid-cols-[4rem_minmax(0,1fr)_6rem_7rem_8rem] gap-4 border-b border-white/10 pb-3 text-xs text-fg-subtle xl:grid">
        <span>{t('stats.salesList.amount')}</span>
        <span>{t('stats.legacy.byPrice.period')}</span>
        <span className="text-right">{t('stats.legacy.sold')}</span>
        <span className="text-right">{t('stats.revenue')}</span>
        <span className="text-right">{t('stats.legacy.byPrice.salesShare')}</span>
      </div>
      <ul className="mt-6 space-y-5 xl:mt-0 xl:space-y-0 xl:divide-y xl:divide-white/5">
        {allPrices.map((price) => {
          const item = prices.find((row) => row.price === price)
          const period = foreverPricePeriods.find((row) => row.price === price)
          const share = item?.count_share ?? 0
          return (
            <li key={price} className="xl:grid xl:grid-cols-[4rem_minmax(0,1fr)_6rem_7rem_8rem] xl:items-center xl:gap-4 xl:py-4">
              <div className="flex items-start gap-3 xl:contents">
                <span className="tabular flex w-14 shrink-0 justify-center rounded-lg bg-accent-500/10 py-2 font-semibold text-accent-500 xl:w-full">
                  {Number.isInteger(price) ? usdWhole(format, price) : usd(format, price)}
                </span>
                <div className="min-w-0 flex-1 xl:contents">
                  <div className="text-xs text-fg-muted sm:text-sm">
                    <span className="sr-only">{t('stats.legacy.byPrice.period')}: </span>
                    {period ? (
                      <>
                        <time dateTime={period.start}>{format.fullDate(period.start)}</time>
                        {' — '}
                        <time dateTime={period.end}>{format.fullDate(period.end)}</time>
                      </>
                    ) : t('stats.legacy.priceHistory.unknownPeriod')}
                  </div>
                  <div className="tabular mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-subtle xl:contents">
                    <span className="xl:text-right xl:text-sm xl:font-medium xl:text-fg">
                      <span className="xl:hidden">{t('stats.legacy.byPrice.sales', { value: format.number(item?.count ?? 0) })}</span>
                      <span className="hidden xl:inline">
                        <span className="sr-only">{t('stats.legacy.sold')}: </span>
                        {format.number(item?.count ?? 0)}
                      </span>
                    </span>
                    <span className="xl:text-right xl:text-sm xl:font-medium xl:text-fg">
                      <span className="sr-only">{t('stats.revenue')}: </span>
                      {usdWhole(format, item?.sum ?? 0)}
                    </span>
                    <div className="xl:text-right xl:text-sm">
                      <span className="xl:hidden">{t('stats.legacy.byPrice.share', { share: format.percent(share) })}</span>
                      <span className="hidden xl:inline">
                        <span className="sr-only">{t('stats.legacy.byPrice.salesShare')}: </span>
                        {format.percent(share)}
                      </span>
                      <div className="mt-2 hidden h-1.5 overflow-hidden rounded-full bg-ink-800 xl:block">
                        <div className="h-full rounded-full bg-accent-500"
                          style={{ width: `${Math.max(share, share > 0 ? 1.5 : 0)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-1 text-xs text-fg-subtle xl:hidden">
                {t('stats.durations.moneyShare')}: {format.percent(item?.money_share ?? 0)}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800 xl:hidden">
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
      <section aria-labelledby="forever-overview-title" className="min-w-0">
        <h2 id="forever-overview-title" className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t('stats.legacy.overviewTitle')}
        </h2>
        {updatedAt ? (
          <p className="mt-1 text-xs text-fg-subtle sm:text-sm">
            {t('stats.updated', { time: format.dateTime(updatedAt) })}
          </p>
        ) : null}
        <div className="mt-4 grid items-start gap-6 xl:grid-cols-2 xl:items-stretch">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 xl:grid-cols-1 xl:grid-rows-3">
            {metrics.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="min-w-0 p-3 text-center sm:p-6 xl:flex xl:flex-col xl:justify-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-fg-muted sm:text-sm">
                  <Icon aria-hidden className="hidden size-4 shrink-0 text-accent-300 sm:block" />
                  <p>{label}</p>
                </div>
                <p className="tabular mt-2 text-lg font-semibold tracking-tight sm:text-3xl">{value}</p>
              </Card>
            ))}
          </div>
          <PaymentsChart payments={forever.by_method} title={t('stats.legacy.payments')}
            layout="inline" donutSize="large" />
        </div>
      </section>
      <ForeverPricesChart prices={forever.by_price} />
    </div>
  )
}
