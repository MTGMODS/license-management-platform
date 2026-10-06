import { useTranslation } from 'react-i18next'

import { useFormatters } from '@/shared/lib/format'
import { Card } from '@/shared/ui'

const pricePeriods = [
  { price: 1, start: '2024-04-01', end: '2024-09-05' },
  { price: 2, start: '2024-09-05', end: '2024-10-06' },
  { price: 3, start: '2024-10-06', end: '2024-11-24' },
  { price: 4, start: '2024-11-24', end: '2025-02-18' },
  { price: 5, start: '2025-02-18', end: '2025-09-04' },
  { price: 10, start: '2025-09-04', end: '2026-01-20' },
  { price: 15, start: '2026-01-20', end: '2026-03-01' },
] as const

export function ForeverPriceHistory() {
  const { t } = useTranslation('vip')
  const format = useFormatters()

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold tracking-tight">
        {t('stats.legacy.priceHistory.title')}
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-fg-muted">
        {t('stats.legacy.priceHistory.subtitle')}
      </p>
      <ul className="mt-5 divide-y divide-white/10">
        {pricePeriods.map(({ price, start, end }) => (
          <li key={price} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            <span className="tabular flex w-14 shrink-0 justify-center rounded-lg bg-accent-500/10 py-2 font-semibold text-accent-500">
              ${price}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-fg-muted">
              <time dateTime={start}>{format.fullDate(start)}</time>
              <span aria-hidden="true">—</span>
              <time dateTime={end}>{format.fullDate(end)}</time>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-fg-subtle">
        {t('stats.legacy.priceHistory.boundaries')}
      </p>
    </Card>
  )
}
