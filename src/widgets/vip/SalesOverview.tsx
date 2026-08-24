import { ArrowDown, CircleDollarSign, Crown, ShoppingCart, TrendingUp } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { useSalesStats } from '@/features/license/useSalesStats'
import { usePublicStats } from '@/features/usage/usePublicStats'
import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'
import { Card, Skeleton } from '@/shared/ui'

interface StatItem {
  id: string
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
}

/** Tall fold (FHD+): 2×2. Short CSS viewport (HD / scaled UHD): one row of four. */
const COMPACT_GRID =
  'grid grid-cols-4 gap-[clamp(0.35rem,0.9vh,0.65rem)] [@media(min-height:56rem)]:grid-cols-2 [@media(min-height:56rem)]:gap-[clamp(0.45rem,1.1vh,0.75rem)]'

export function SalesOverview({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const { data, isPending, isError } = useSalesStats()
  const { data: usage } = usePublicStats()

  if (isError) return null

  if (!data) {
    if (!isPending) return null

    return (
      <section>
        <h2
          className={cn(
            'font-semibold tracking-tight',
            compact ? 'text-[clamp(0.95rem,1.7vh,1.2rem)]' : 'text-lg sm:text-xl',
          )}
        >
          {t('stats.title')}
        </h2>
        <p className={cn('text-fg-muted', compact ? 'mt-0.5 text-[clamp(0.65rem,1.1vh,0.75rem)]' : 'mt-1 text-sm')}>
          {t('stats.subtitle')}
        </p>
        <div className={cn(compact ? cn('mt-[clamp(0.35rem,0.9vh,0.65rem)]', COMPACT_GRID) : 'mt-4 grid grid-cols-2 gap-3')}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              key={index}
              className={
                compact
                  ? 'h-[clamp(3.5rem,7vh,4.25rem)] [@media(min-height:56rem)]:h-[clamp(4.5rem,9vh,5.75rem)]'
                  : 'h-20'
              }
              label={index === 0 ? t('stats.loading') : undefined}
            />
          ))}
        </div>
      </section>
    )
  }

  const { new_subs: subs } = data
  const conversion = usage?.overview.metrics.vip_conversion

  const items: StatItem[] = [
    {
      id: 'sales',
      label: t('stats.sales'),
      value: format.number(subs.total_vips),
      icon: ShoppingCart,
    },
    {
      id: 'revenue',
      label: t('stats.revenue'),
      value: `$${format.number(subs.total_money)}`,
      icon: CircleDollarSign,
    },
    {
      id: 'active',
      label: t('stats.active'),
      value: format.number(subs.active_total),
      icon: Crown,
    },
    {
      id: 'conversion',
      label: t('stats.conversion'),
      value: conversion == null ? '—' : format.percent(conversion),
      icon: TrendingUp,
    },
  ]

  return (
    <section>
      <h2
        className={cn(
          'font-semibold tracking-tight',
          compact ? 'text-[clamp(0.95rem,1.7vh,1.2rem)]' : 'text-lg sm:text-xl',
        )}
      >
        {t('stats.title')}
      </h2>
      <p className={cn('text-fg-muted', compact ? 'mt-0.5 text-[clamp(0.65rem,1.1vh,0.75rem)]' : 'mt-1 text-sm')}>
        {t('stats.subtitle')}
      </p>

      <div className={cn(compact ? cn('mt-[clamp(0.35rem,0.9vh,0.65rem)]', COMPACT_GRID) : 'mt-4 grid grid-cols-2 gap-3')}>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Card
              key={item.id}
              className={cn(
                'text-center',
                compact
                  ? 'flex min-h-[clamp(3.5rem,7vh,4.25rem)] flex-col justify-center p-[clamp(0.45rem,1vh,0.7rem)] [@media(min-height:56rem)]:min-h-[clamp(4.5rem,9vh,5.75rem)] [@media(min-height:56rem)]:p-[clamp(0.7rem,1.4vh,1rem)]'
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
                    ? 'mt-1 text-[clamp(1rem,1.9vh,1.35rem)] [@media(min-height:56rem)]:mt-1.5 [@media(min-height:56rem)]:text-[clamp(1.2rem,2.2vh,1.65rem)]'
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
          compact ? 'mt-1.5 text-[0.65rem] sm:text-[0.7rem]' : 'mt-3 text-xs sm:text-sm',
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
