import { Coins, Repeat2, ShoppingBag, UserRound } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import type { LicenseSaleRow } from '@/shared/api/license'
import { useFormatters } from '@/shared/lib/format'

import { summarizeSales, type SalesRangeMode } from './salesAnalysis'
import { usdAmount } from './salesStatsFormat'

export const SalesPeriodSummary = memo(function SalesPeriodSummary({
  rows, total, mode,
}: {
  rows: LicenseSaleRow[]
  total: number
  mode: SalesRangeMode
}) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const summary = summarizeSales(rows)
  const showKinds = summary.unknown < summary.count || summary.count === 0

  const metrics = [
    {
      label: t('stats.salesList.selectedSales', { context: mode }), value: format.number(summary.count),
      icon: ShoppingBag, color: 'text-accent-400',
      detail: t('stats.salesList.ofAllSales', { total: format.number(total) }),
    },
    {
      label: t('stats.salesList.selectedRevenue', { context: mode }), value: usdAmount(format, summary.sum),
      icon: Coins, color: 'text-emerald-400',
      detail: t('stats.salesList.paidOnly'),
    },
    ...(showKinds ? (['first', 'repeat'] as const).map((kind) => ({
      label: t(`stats.salesList.${kind}Purchases`), value: format.number(summary[kind].count),
      icon: kind === 'first' ? UserRound : Repeat2,
      color: kind === 'first' ? 'text-sky-300' : 'text-violet-300',
      detail: t('stats.salesList.purchaseRevenue', { sum: usdAmount(format, summary[kind].sum) }),
    })) : []),
  ]

  return (
    <section aria-label={t('stats.salesList.results', { context: mode })}>
      <dl className={`grid grid-cols-2 gap-3 ${showKinds ? 'xl:grid-cols-4' : ''}`}>
        {metrics.map(({ label, value, icon: Icon, color, detail }) => (
          <div key={label} className="min-w-0 rounded-xl border border-white/8 bg-white/[0.025] p-3 sm:p-4">
            <dt className="flex items-start gap-2 text-xs text-fg-muted sm:items-center sm:text-sm">
              <Icon aria-hidden className={`size-4 shrink-0 ${color}`} />{label}
            </dt>
            <dd className={`mt-2 tabular text-2xl font-semibold tracking-tight ${color}`}>{value}</dd>
            <dd className="mt-1 text-xs leading-relaxed text-fg-subtle">{detail}</dd>
          </div>
        ))}
      </dl>
      {summary.unknown > 0 ? (
        <p className="mt-1 text-xs text-fg-subtle">
          {t('stats.salesList.unclassified', { count: format.number(summary.unknown) })}
        </p>
      ) : null}
    </section>
  )
})
