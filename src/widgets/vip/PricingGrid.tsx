import { Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useLocalUsdPrice } from '@/features/geo/useLocalUsdPrice'
import { useTariffs } from '@/features/license/useTariffs'
import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'
import { Badge, Card, Skeleton } from '@/shared/ui'

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

export function PricingGrid({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const { data, isPending, isError } = useTariffs()
  const { formatApprox } = useLocalUsdPrice()
  const gridClass = cn(
    'grid w-full grid-cols-2 items-stretch lg:grid-cols-4',
    compact ? 'gap-[clamp(0.4rem,1vh,0.75rem)]' : 'gap-3 lg:gap-4',
  )

  if (isPending) {
    return (
      <div className={gridClass}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            className={compact ? 'h-[clamp(7.5rem,18vh,11rem)]' : 'h-36'}
            label={index === 0 ? t('pricing.loading') : undefined}
          />
        ))}
      </div>
    )
  }

  if (isError || !data || data.plans.length === 0) {
    return null
  }

  return (
    <div className={gridClass}>
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
        const localApprox = formatApprox(plan.price)

        return (
          <Card
            key={plan.duration_days}
            className={cn(
              'flex flex-col border border-accent-500/40 text-left',
              compact ? 'p-[clamp(0.55rem,1.1vh,0.85rem)]' : 'p-3.5 sm:p-4',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p
                className={cn(
                  'text-fg-muted',
                  compact ? 'text-[clamp(0.7rem,1.2vh,0.85rem)]' : 'text-xs sm:text-sm',
                )}
              >
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

            <div
              className={cn(
                'flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5',
                compact ? 'mt-[clamp(0.25rem,0.7vh,0.5rem)]' : 'mt-1.5 gap-x-2',
              )}
            >
              <p
                className={cn(
                  'tabular font-semibold tracking-tight',
                  compact
                    ? 'text-[clamp(1.25rem,2.8vh,1.875rem)]'
                    : 'text-2xl sm:text-3xl',
                )}
              >
                ${catalogPrice(plan.price, format)}
              </p>
              {localApprox ? (
                <>
                  <span
                    className={cn(
                      'font-semibold text-fg-subtle',
                      compact
                        ? 'text-[clamp(1.25rem,2.8vh,1.875rem)]'
                        : 'text-2xl sm:text-3xl',
                    )}
                    aria-hidden
                  >
                    ≈
                  </span>
                  <p
                    className={cn(
                      'tabular font-semibold tracking-tight',
                      compact
                        ? 'text-[clamp(1.25rem,2.8vh,1.875rem)]'
                        : 'text-2xl sm:text-3xl',
                    )}
                  >
                    {localApprox}
                  </p>
                </>
              ) : null}
            </div>
            <p
              className={cn(
                'tabular text-fg-subtle',
                compact ? 'mt-0.5 text-[clamp(0.65rem,1.1vh,0.75rem)]' : 'mt-0.5 text-xs',
              )}
            >
              {t('pricing.perDay', { price: format.money(plan.price / plan.duration_days) })}
            </p>

            <p
              className={cn(
                'flex items-center gap-1.5 border-t border-white/8 text-fg-muted',
                compact
                  ? 'mt-[clamp(0.4rem,1vh,0.7rem)] pt-[clamp(0.35rem,0.9vh,0.6rem)] text-[clamp(0.65rem,1.15vh,0.8rem)]'
                  : 'mt-3 pt-2.5 text-xs sm:text-sm',
              )}
            >
              <Smartphone aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />
              <span className="min-w-0 leading-snug">{devicesLine}</span>
            </p>
          </Card>
        )
      })}
    </div>
  )
}
