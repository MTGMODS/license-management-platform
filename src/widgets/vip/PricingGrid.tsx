import { Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useLocalUsdPrice } from '@/features/geo/useLocalUsdPrice'
import { useTariffs } from '@/features/license/useTariffs'
import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'
import { Card, Skeleton } from '@/shared/ui'

const SHORT_DESKTOP = '[@media(min-width:1024px)_and_(max-height:48rem)]'

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
    compact
      ? cn('gap-[clamp(0.4rem,1vh,0.75rem)]', `${SHORT_DESKTOP}:gap-2`)
      : 'gap-3 lg:gap-4',
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
        const devices = t('pricing.devices', { count: plan.max_devices })
        const devicesLine =
          plan.reset_limit > 0
            ? t('pricing.devicesWithReset', {
                devices,
                reset: t('pricing.resetShort', { count: plan.reset_limit }),
              })
            : devices
        const localApprox = formatApprox(plan.price)
        const daysLabel = t('pricing.days', { count: plan.duration_days })
        const perDayPrice = format.money(plan.price / plan.duration_days)
        const daysLine = {
          days: daysLabel,
          price: perDayPrice,
        }

        return (
          <Card
            key={plan.duration_days}
            className={cn(
              'flex flex-col border border-accent-500/40 text-left',
              compact
                ? cn('p-[clamp(0.55rem,1.1vh,0.85rem)]', `${SHORT_DESKTOP}:p-2.5`)
                : 'p-3.5 sm:p-4',
            )}
          >
            <p
              className={cn(
                'whitespace-nowrap text-fg-muted tabular',
                compact
                  ? cn(
                      'text-[clamp(0.6rem,1.1vh,0.75rem)]',
                      `${SHORT_DESKTOP}:text-[0.65rem]`,
                    )
                  : 'text-[0.7rem] sm:text-sm',
              )}
            >
              <span className="inline sm:hidden lg:inline">
                {t('pricing.daysWithPerDayTight', daysLine)}
              </span>
              <span className="hidden sm:inline lg:hidden">{t('pricing.daysWithPerDay', daysLine)}</span>
            </p>

            <div
              className={cn(
                'flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5',
                compact
                  ? cn('mt-[clamp(0.25rem,0.7vh,0.5rem)]', `${SHORT_DESKTOP}:mt-1`)
                  : 'mt-1.5 gap-x-2',
              )}
            >
              <p
                className={cn(
                  'tabular font-semibold tracking-tight',
                  compact
                    ? cn(
                        'text-[clamp(1.25rem,2.8vh,1.875rem)]',
                        `${SHORT_DESKTOP}:text-xl`,
                      )
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
                        ? cn(
                            'text-[clamp(1.25rem,2.8vh,1.875rem)]',
                            `${SHORT_DESKTOP}:text-xl`,
                          )
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
                        ? cn(
                            'text-[clamp(1.25rem,2.8vh,1.875rem)]',
                            `${SHORT_DESKTOP}:text-xl`,
                          )
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
                'flex items-center gap-1.5 border-t border-white/8 text-fg-muted',
                compact
                  ? cn(
                      'mt-[clamp(0.4rem,1vh,0.7rem)] pt-[clamp(0.35rem,0.9vh,0.6rem)] text-[clamp(0.65rem,1.15vh,0.8rem)]',
                      `${SHORT_DESKTOP}:mt-2 ${SHORT_DESKTOP}:pt-1.5 ${SHORT_DESKTOP}:text-[0.65rem]`,
                    )
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
