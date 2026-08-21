import { Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useTariffs } from '@/features/license/useTariffs'
import { useFormatters } from '@/shared/lib/format'
import { Badge, Card, ErrorState, Skeleton } from '@/shared/ui'

const BEST_VALUE_DAYS = 365

function planBadge(days: number): 'pricing.cheapest' | 'pricing.featured' | '2+1' | null {
  if (days === 7) return 'pricing.cheapest'
  if (days === BEST_VALUE_DAYS) return 'pricing.featured'
  if (days === 90) return '2+1'
  return null
}

function catalogPrice(price: number, format: ReturnType<typeof useFormatters>): string {
  return Number.isInteger(price) ? String(price) : format.money(price)
}

export function PricingGrid() {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const { data, isPending, isError, refetch, isFetching } = useTariffs()

  if (isPending) {
    return (
      <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            className="h-36"
            label={index === 0 ? t('pricing.loading') : undefined}
          />
        ))}
      </div>
    )
  }

  if (isError || !data || data.plans.length === 0) {
    return (
      <Card className="w-full p-5">
        <ErrorState
          compact
          description={t('pricing.error')}
          retrying={isFetching}
          onRetry={() => void refetch()}
        />
      </Card>
    )
  }

  return (
    <div className="grid w-full grid-cols-2 items-stretch gap-3 lg:grid-cols-4 lg:gap-4">
      {data.plans.map((plan) => {
        const badge = planBadge(plan.duration_days)
        const devices = t('pricing.devices', { count: plan.max_devices })
        const devicesLine =
          plan.reset_limit > 0
            ? t('pricing.devicesWithReset', {
                devices,
                reset: t('pricing.resetShort', { count: plan.reset_limit }),
              })
            : devices

        return (
          <Card
            key={plan.duration_days}
            className="flex flex-col border border-accent-500/40 p-3.5 text-left sm:p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-fg-muted sm:text-sm">
                {t('pricing.days', { count: plan.duration_days })}
              </p>
              {badge === '2+1' ? (
                <Badge tone="accent" className="shrink-0 px-1.5 py-0 text-[0.65rem]">
                  2+1
                </Badge>
              ) : badge ? (
                <Badge tone="accent" className="shrink-0 px-1.5 py-0 text-[0.65rem]">
                  {t(badge)}
                </Badge>
              ) : null}
            </div>

            <p className="tabular mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
              ${catalogPrice(plan.price, format)}
            </p>
            <p className="tabular mt-0.5 text-xs text-fg-subtle">
              {t('pricing.perDay', { price: format.money(plan.price / plan.duration_days) })}
            </p>

            <p className="mt-3 flex items-center gap-1.5 border-t border-white/8 pt-2.5 text-xs text-fg-muted sm:text-sm">
              <Smartphone aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />
              <span className="min-w-0 leading-snug">{devicesLine}</span>
            </p>
          </Card>
        )
      })}
    </div>
  )
}
