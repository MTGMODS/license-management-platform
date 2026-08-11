import { useTranslation } from 'react-i18next'

import { PRICING_TIERS } from '@/shared/config/product'
import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'
import { Badge, Card } from '@/shared/ui'

export function PricingGrid() {
  const { t } = useTranslation('vip')
  const format = useFormatters()

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">{t('pricing.title')}</h2>
      <p className="mt-2 text-fg-muted">{t('pricing.subtitle')}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRICING_TIERS.map((tier) => (
          <Card
            key={tier.days}
            className={cn('flex flex-col p-6', tier.featured && 'glow-accent')}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-fg-muted">{t('pricing.days', { count: tier.days })}</p>
              {tier.featured ? <Badge tone="accent">{t('pricing.featured')}</Badge> : null}
            </div>

            <p className="tabular mt-4 text-4xl font-semibold tracking-tight">${tier.priceUsd}</p>

            <p className="tabular mt-2 text-sm text-fg-subtle">
              {t('pricing.perDay', { price: format.money(tier.priceUsd / tier.days) })}
            </p>
          </Card>
        ))}
      </div>
    </section>
  )
}
