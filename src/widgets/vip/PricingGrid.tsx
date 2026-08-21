import { Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useTariffs } from '@/features/license/useTariffs'
import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'
import { Badge, Card, ErrorState, Skeleton } from '@/shared/ui'

const HIGHLIGHT_DAYS = 30
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
      <div className="grid w-full grid-cols-2 gap-[clamp(0.5rem,1.2vh,1rem)] lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            className="h-[clamp(9rem,22vh,12rem)]"
            label={index === 0 ? t('pricing.loading') : undefined}
          />
        ))}
      </div>
    )
  }

  if (isError || !data || data.plans.length === 0) {
    return (
      <Card className="w-full p-[clamp(0.75rem,1.6vh,1.25rem)]">
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
    <div className="grid w-full grid-cols-2 items-stretch gap-[clamp(0.5rem,1.2vh,1rem)] lg:grid-cols-4">
      {data.plans.map((plan) => {
        const badge = planBadge(plan.duration_days)
        const isHighlight = plan.duration_days === HIGHLIGHT_DAYS
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
            className={cn(
              'flex flex-col border p-[clamp(0.7rem,1.5vh,1.1rem)] text-left',
              isHighlight
                ? 'border-accent-400/80 ring-1 ring-inset ring-accent-300/35'
                : 'border-accent-500/20',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[clamp(0.7rem,1.3vh,0.875rem)] text-fg-muted">
                {t('pricing.days', { count: plan.duration_days })}
              </p>
              {badge === '2+1' ? (
                <Badge tone="accent" className="shrink-0 px-2 py-0.5 text-[0.65rem]">
                  2+1
                </Badge>
              ) : badge ? (
                <Badge tone="accent" className="shrink-0 px-2 py-0.5 text-[0.65rem]">
                  {t(badge)}
                </Badge>
              ) : null}
            </div>

            <p className="tabular mt-[clamp(0.35rem,0.9vh,0.6rem)] text-[clamp(1.5rem,3.4vh,2.25rem)] font-semibold tracking-tight">
              ${catalogPrice(plan.price, format)}
            </p>
            <p className="tabular mt-0.5 text-[clamp(0.65rem,1.2vh,0.8rem)] text-fg-subtle">
              {t('pricing.perDay', { price: format.money(plan.price / plan.duration_days) })}
            </p>

            <p className="mt-[clamp(0.55rem,1.3vh,0.85rem)] flex items-center gap-1.5 border-t border-white/8 pt-[clamp(0.5rem,1.2vh,0.75rem)] text-[clamp(0.7rem,1.3vh,0.875rem)] text-fg-muted">
              <Smartphone aria-hidden className="size-[clamp(0.8rem,1.5vh,0.9rem)] shrink-0 text-fg-subtle" />
              {devicesLine}
            </p>
          </Card>
        )
      })}
    </div>
  )
}
