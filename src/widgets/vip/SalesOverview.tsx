import { ArrowDown, CircleDollarSign, Crown, ShoppingCart, TrendingUp } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { useSalesStats } from '@/features/license/useSalesStats'
import { usePublicStats } from '@/features/usage/usePublicStats'
import { useFormatters } from '@/shared/lib/format'
import { Card, Skeleton } from '@/shared/ui'

interface StatItem {
  id: string
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
}

export function SalesOverview() {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const { data, isPending, isError } = useSalesStats()
  const { data: usage } = usePublicStats()

  if (isError) return null

  if (!data) {
    if (!isPending) return null

    return (
      <section>
        <h2 className="text-[clamp(1.05rem,2.2vh,1.25rem)] font-semibold tracking-tight">
          {t('stats.title')}
        </h2>
        <p className="mt-1 text-[clamp(0.75rem,1.4vh,0.875rem)] text-fg-muted">{t('stats.subtitle')}</p>
        <div className="mt-[clamp(0.5rem,1.2vh,1rem)] grid grid-cols-2 gap-[clamp(0.5rem,1.2vh,1rem)] lg:grid-cols-4 lg:gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-[clamp(3.75rem,10vh,5rem)]"
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
      <h2 className="text-[clamp(1.05rem,2.2vh,1.25rem)] font-semibold tracking-tight">
        {t('stats.title')}
      </h2>
      <p className="mt-1 text-[clamp(0.75rem,1.4vh,0.875rem)] text-fg-muted">{t('stats.subtitle')}</p>

      <div className="mt-[clamp(0.5rem,1.2vh,1rem)] grid grid-cols-2 gap-[clamp(0.5rem,1.2vh,1rem)] lg:grid-cols-4 lg:gap-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.id} className="p-[clamp(0.65rem,1.4vh,1rem)] text-center lg:p-3">
              <div className="flex items-center justify-center gap-2">
                <Icon aria-hidden className="size-[clamp(1rem,2.2vh,1.25rem)] shrink-0 text-accent-300" />
                <p className="min-w-0 truncate text-[clamp(0.75rem,1.4vh,0.875rem)] text-fg-subtle">
                  {item.label}
                </p>
              </div>
              <p className="tabular mt-[clamp(0.35rem,1vh,0.75rem)] whitespace-nowrap text-[clamp(1.15rem,2.6vh,1.5rem)] font-semibold tracking-tight">
                {item.value}
              </p>
            </Card>
          )
        })}
      </div>

      <div className="mt-[clamp(0.5rem,1.2vh,1rem)] flex flex-wrap items-center justify-between gap-2 text-[clamp(0.75rem,1.4vh,0.875rem)] text-fg-subtle">
        <span>{t('stats.updated', { time: format.dateTime(data.updated_at) })}</span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowDown aria-hidden className="size-4" />
          {t('stats.more')}
        </span>
      </div>
    </section>
  )
}
