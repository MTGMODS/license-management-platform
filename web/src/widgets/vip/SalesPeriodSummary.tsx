import { Coins, Repeat2, ShoppingBag, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { LicenseSaleRow } from '@/shared/api/license'
import { useFormatters } from '@/shared/lib/format'

import { summarizeSales, type SalesRange } from './salesAnalysis'
import { usdAmount } from './salesStatsFormat'

export function SalesPeriodSummary({
  rows, previous, comparison, total, mode,
}: {
  rows: LicenseSaleRow[]
  previous: LicenseSaleRow[]
  comparison: SalesRange | null
  total: number
  mode: 'day' | 'range'
}) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const summary = summarizeSales(rows)
  const before = summarizeSales(previous)
  const showKinds = summary.unknown < summary.count || summary.count === 0

  function change(value: number, baseline: number) {
    if (baseline === 0) return t('stats.salesList.noBaseline')
    const percent = ((value - baseline) / baseline) * 100
    return `${percent > 0 ? '+' : ''}${format.percent(percent)}`
  }

  const metrics = [
    {
      label: t('stats.salesList.selectedSales', { context: mode }), value: format.number(summary.count),
      icon: ShoppingBag, color: 'text-accent-400',
      detail: comparison ? t('stats.salesList.change', {
        value: format.number(before.count), change: change(summary.count, before.count),
      }) : t('stats.salesList.ofAllSales', { total: format.number(total) }),
    },
    {
      label: t('stats.salesList.selectedRevenue', { context: mode }), value: usdAmount(format, summary.sum),
      icon: Coins, color: 'text-emerald-400',
      detail: comparison ? t('stats.salesList.change', {
        value: usdAmount(format, before.sum), change: change(summary.sum, before.sum),
      }) : t('stats.salesList.paidOnly'),
    },
    ...(showKinds ? (['first', 'repeat'] as const).map((kind) => ({
      label: t(`stats.salesList.${kind}Purchases`), value: format.number(summary[kind].count),
      icon: kind === 'first' ? UserRound : Repeat2,
      color: kind === 'first' ? 'text-sky-300' : 'text-violet-300',
      detail: t('stats.salesList.purchaseRevenue', { sum: usdAmount(format, summary[kind].sum) }),
    })) : []),
  ]

  return (
    <section aria-label={t('stats.salesList.results', { context: mode })} className="mt-5">
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
      {comparison ? (
        <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
          {t('stats.salesList.comparedWith', {
            from: format.fullDate(comparison.from), to: format.fullDate(comparison.to),
          })}
        </p>
      ) : null}
      {summary.unknown > 0 ? (
        <p className="mt-1 text-xs text-fg-subtle">
          {t('stats.salesList.unclassified', { count: format.number(summary.unknown) })}
        </p>
      ) : null}
    </section>
  )
}
