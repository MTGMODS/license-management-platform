import { ArrowDown, BadgeDollarSign, CircleDollarSign, Crown, ShoppingCart, UserRound, Users } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { useSalesStats } from '@/features/license/useSalesStats'
import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'
import { Card, Skeleton } from '@/shared/ui'

interface StatItem {
  id: string
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
}

/** Tall fold (FHD+): 2×3. Short desktop (HD): one row of six / wrap of three. */
const COMPACT_GRID = cn(
  'grid grid-cols-3 gap-[clamp(0.35rem,0.9vh,0.65rem)] sm:grid-cols-6',
  '[@media(min-width:1024px)_and_(max-height:48rem)]:grid-cols-3',
  '[@media(min-width:1024px)_and_(max-height:48rem)]:sm:grid-cols-3',
  '[@media(min-height:56rem)]:grid-cols-3',
  '[@media(min-height:56rem)]:gap-[clamp(0.45rem,1.1vh,0.75rem)]',
)

const SHORT_DESKTOP = '[@media(min-width:1024px)_and_(max-height:48rem)]'

export function SalesOverview({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const { data, isPending, isError } = useSalesStats()

  if (isError) return null

  if (!data) {
    if (!isPending) return null

    return (
      <section>
        <h2
          className={cn(
            'font-semibold tracking-tight',
            compact
              ? cn('text-[clamp(0.95rem,1.7vh,1.2rem)]', `${SHORT_DESKTOP}:text-sm`)
              : 'text-lg sm:text-xl',
          )}
        >
          {t('stats.title')}
        </h2>
        <p
          className={cn(
            'text-fg-muted',
            compact
              ? cn(
                  'mt-0.5 text-[clamp(0.65rem,1.1vh,0.75rem)]',
                  `${SHORT_DESKTOP}:text-[0.65rem]`,
                )
              : 'mt-1 text-sm',
          )}
        >
          {t('stats.subtitle')}
        </p>
        <div className={cn(compact ? cn('mt-[clamp(0.35rem,0.9vh,0.65rem)]', COMPACT_GRID) : 'mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3')}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={index}
              className={
                compact
                  ? cn(
                      'h-[clamp(3.5rem,7vh,4.25rem)]',
                      `${SHORT_DESKTOP}:h-11`,
                      '[@media(min-height:56rem)]:h-[clamp(4.5rem,9vh,5.75rem)]',
                    )
                  : 'h-20'
              }
              label={index === 0 ? t('stats.loading') : undefined}
            />
          ))}
        </div>
      </section>
    )
  }

  const { subscriptions: subs } = data
  const { overview: o } = subs

  const items: StatItem[] = [
    {
      id: 'buyers',
      label: t('stats.buyers'),
      value: format.number(subs.retention.buyers),
      icon: Users,
    },
    {
      id: 'sales',
      label: t('stats.sales'),
      value: format.number(o.total_sold),
      icon: ShoppingCart,
    },
    {
      id: 'active',
      label: t('stats.active'),
      value: format.number(o.active),
      icon: Crown,
    },
    {
      id: 'revenue',
      label: t('stats.revenue'),
      value: `$${format.number(o.total_money)}`,
      icon: CircleDollarSign,
    },
    {
      id: 'avgCheck',
      label: t('stats.overview.avgCheck'),
      value: `$${format.money(o.avg_check)}`,
      icon: BadgeDollarSign,
    },
    {
      id: 'avgRevenue',
      label: t('stats.overview.avgRevenuePerBuyer'),
      value: `$${format.money(o.avg_revenue_per_buyer)}`,
      icon: UserRound,
    },
  ]

  return (
    <section>
      <h2
        className={cn(
          'font-semibold tracking-tight',
          compact
            ? cn('text-[clamp(0.95rem,1.7vh,1.2rem)]', `${SHORT_DESKTOP}:text-sm`)
            : 'text-lg sm:text-xl',
        )}
      >
        {t('stats.title')}
      </h2>
      <p
        className={cn(
          'text-fg-muted',
          compact
            ? cn(
                'mt-0.5 text-[clamp(0.65rem,1.1vh,0.75rem)]',
                `${SHORT_DESKTOP}:text-[0.65rem]`,
              )
            : 'mt-1 text-sm',
        )}
      >
        {t('stats.subtitle')}
      </p>

      <div className={cn(compact ? cn('mt-[clamp(0.35rem,0.9vh,0.65rem)]', COMPACT_GRID) : 'mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3')}>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Card
              key={item.id}
              className={cn(
                'text-center',
                compact
                  ? cn(
                      'flex min-h-[clamp(3.5rem,7vh,4.25rem)] flex-col justify-center p-[clamp(0.45rem,1vh,0.7rem)]',
                      `${SHORT_DESKTOP}:min-h-11 ${SHORT_DESKTOP}:p-2`,
                      '[@media(min-height:56rem)]:min-h-[clamp(4.5rem,9vh,5.75rem)]',
                      '[@media(min-height:56rem)]:p-[clamp(0.7rem,1.4vh,1rem)]',
                    )
                  : 'p-3 sm:p-4',
              )}
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <Icon
                  aria-hidden
                  className={cn('shrink-0 text-accent-300', compact ? 'size-3.5' : 'size-3.5 sm:size-4')}
                />
                <p
                  className={cn(
                    'min-w-0 text-fg-subtle',
                    compact
                      ? 'truncate text-[clamp(0.62rem,1.15vh,0.78rem)] leading-snug [@media(min-height:56rem)]:whitespace-normal [@media(min-height:56rem)]:text-xs'
                      : 'truncate text-[0.7rem] sm:text-sm',
                  )}
                >
                  {item.label}
                </p>
              </div>
              <p
                className={cn(
                  'tabular font-semibold tracking-tight',
                  compact
                    ? cn(
                        'mt-1 text-[clamp(1rem,1.9vh,1.35rem)]',
                        `${SHORT_DESKTOP}:mt-0.5 ${SHORT_DESKTOP}:text-base`,
                        '[@media(min-height:56rem)]:mt-1.5',
                        '[@media(min-height:56rem)]:text-[clamp(1.2rem,2.2vh,1.65rem)]',
                      )
                    : 'mt-2 text-xl sm:text-2xl',
                )}
              >
                {item.value}
              </p>
            </Card>
          )
        })}
      </div>

      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 text-fg-subtle',
          compact
            ? cn(
                'mt-1.5 text-[0.65rem] sm:text-[0.7rem]',
                `${SHORT_DESKTOP}:mt-1 ${SHORT_DESKTOP}:text-[0.625rem]`,
              )
            : 'mt-3 text-xs sm:text-sm',
        )}
      >
        <span>{t('stats.updated', { time: format.dateTime(data.updated_at) })}</span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowDown aria-hidden className="size-3.5" />
          {t('stats.more')}
        </span>
      </div>
    </section>
  )
}
