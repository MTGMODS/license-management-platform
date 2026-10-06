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
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <caption className="sr-only">{t('stats.legacy.byPrice.title')}</caption>
          <thead>
            <tr className="border-b border-white/10 text-xs text-fg-subtle">
              <th scope="col" className="pb-3 pr-4 font-medium">{t('stats.salesList.amount')}</th>
              <th scope="col" className="min-w-80 px-3 pb-3 font-medium">{t('stats.legacy.byPrice.period')}</th>
              <th scope="col" className="px-3 pb-3 text-right font-medium">{t('stats.legacy.sold')}</th>
              <th scope="col" className="px-3 pb-3 text-right font-medium">{t('stats.revenue')}</th>
              <th scope="col" className="w-32 px-3 pb-3 text-right font-medium">{t('stats.legacy.byPrice.salesShare')}</th>
              <th scope="col" className="w-32 pl-3 pb-3 text-right font-medium">{t('stats.durations.moneyShare')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {allPrices.map((price) => {
              const item = prices.find((row) => row.price === price)
              const period = foreverPricePeriods.find((row) => row.price === price)
              const shares = [
                { key: 'sales', value: item?.count_share ?? 0, color: 'bg-accent-500' },
                { key: 'revenue', value: item?.money_share ?? 0, color: 'bg-emerald-400' },
              ]
              return (
                <tr key={price}>
                  <th scope="row" className="py-4 pr-4">
                    <span className="tabular flex w-16 justify-center rounded-lg bg-accent-500/10 py-2 font-semibold text-accent-500">
                      {Number.isInteger(price) ? usdWhole(format, price) : usd(format, price)}
                    </span>
                  </th>
                  <td className="px-3 py-4 text-fg-muted">
                    {period ? (
                      <>
                        <time dateTime={period.start}>{format.fullDate(period.start)}</time>
                        {' — '}
                        <time dateTime={period.end}>{format.fullDate(period.end)}</time>
                      </>
                    ) : t('stats.legacy.priceHistory.unknownPeriod')}
                  </td>
                  <td className="tabular px-3 py-4 text-right font-medium">{format.number(item?.count ?? 0)}</td>
                  <td className="tabular whitespace-nowrap px-3 py-4 text-right font-medium">{usdWhole(format, item?.sum ?? 0)}</td>
                  {shares.map(({ key, value, color }) => (
                    <td key={key} className="tabular px-3 py-4 text-right last:pr-0">
                      {format.percent(value)}
                      <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800">
                        <div className={`h-full rounded-full ${color}`}
                          style={{ width: `${Math.max(value, value > 0 ? 1.5 : 0)}%` }} />
                      </div>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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
        <p className="mt-1 text-xs text-fg-muted sm:text-sm">
          {t('stats.updated', { time: updatedAt ? format.dateTime(updatedAt) : '—' })}
        </p>
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
