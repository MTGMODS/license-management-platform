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
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t('stats.title')}</h2>
        <p className="mt-1 text-sm text-fg-muted">{t('stats.subtitle')}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-20"
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
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t('stats.title')}</h2>
      <p className="mt-1 text-sm text-fg-muted">{t('stats.subtitle')}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.id} className="p-3 text-center sm:p-4">
              <div className="flex items-center justify-center gap-2">
                <Icon aria-hidden className="size-4 shrink-0 text-accent-300" />
                <p className="min-w-0 truncate text-xs text-fg-subtle sm:text-sm">{item.label}</p>
              </div>
              <p className="tabular mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                {item.value}
              </p>
            </Card>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle sm:text-sm">
        <span>{t('stats.updated', { time: format.dateTime(data.updated_at) })}</span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowDown aria-hidden className="size-3.5" />
          {t('stats.more')}
        </span>
      </div>
    </section>
  )
}
