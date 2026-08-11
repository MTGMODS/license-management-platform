import { Crown } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge, DeferredMount, Skeleton } from '@/shared/ui'
import { PricingGrid } from '@/widgets/vip/PricingGrid'

/** Shares the charting chunk with the helper analytics; loaded on approach. */
const SalesStats = lazy(() =>
  import('@/widgets/vip/SalesStats').then((module) => ({ default: module.SalesStats })),
)

export function VipPage() {
  const { t } = useTranslation('vip')

  return (
    <div className="shell space-y-16 py-16">
      <section className="text-center">
        <Badge tone="accent">
          <Crown aria-hidden className="size-3.5" />
          {t('hero.badge')}
        </Badge>

        <h1 className="text-gradient mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t('hero.title')}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-fg-muted">
          {t('hero.subtitle')}
        </p>
      </section>

      <PricingGrid />

      <DeferredMount fallback={<Skeleton className="h-96" />}>
        <Suspense fallback={<Skeleton className="h-96" />}>
          <SalesStats />
        </Suspense>
      </DeferredMount>
    </div>
  )
}
