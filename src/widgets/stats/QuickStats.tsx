import { ArrowDown, Crown, Globe2, MonitorSmartphone, Rocket, Server, Users } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { usePublicStats } from '@/features/usage/usePublicStats'
import { useFormatters } from '@/shared/lib/format'
import { Card, Skeleton } from '@/shared/ui'

interface StatItem {
  id: string
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
}

export function QuickStats() {
  const { t } = useTranslation('helper')
  const format = useFormatters()
  const { data, isPending, isError } = usePublicStats()

  if (isError) return null

  if (!data) {
    if (!isPending) return null

    return (
      <section>
        <h2 className="text-[clamp(1.05rem,2.2vh,1.25rem)] font-semibold tracking-tight">
          {t('stats.title')}
        </h2>
        <p className="mt-1 text-[clamp(0.75rem,1.4vh,0.875rem)] text-fg-muted">{t('stats.subtitle')}</p>
        <div className="mt-[clamp(0.5rem,1.2vh,1rem)] grid grid-cols-2 gap-[clamp(0.5rem,1.2vh,1rem)] lg:grid-cols-6 lg:gap-3">
          {Array.from({ length: 6 }, (_, index) => (
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

  const items: StatItem[] = [
    {
      id: 'launches',
      label: t('stats.launches'),
      value: format.number(data.overview.launches.all_time),
      icon: Rocket,
    },
    {
      id: 'users',
      label: t('stats.users'),
      value: format.number(data.overview.users.total.all_time),
      icon: Users,
    },
    {
      id: 'vip',
      label: t('stats.vip'),
      value: `${format.number(data.overview.users.vip.all_time)} (${format.percent(data.overview.metrics.vip_conversion)})`,
      icon: Crown,
    },
    {
      id: 'devices',
      label: t('stats.devices'),
      value: `${format.percent(data.overview.metrics.pc_ratio)} / ${format.percent(data.overview.metrics.mobile_ratio)}`,
      icon: MonitorSmartphone,
    },
    {
      id: 'countries',
      label: t('stats.countries'),
      value: format.number(
        data.distribution.countries.filter((item) => item.code !== 'UNKNOWN').length,
      ),
      icon: Globe2,
    },
    {
      id: 'servers',
      label: t('stats.servers'),
      value: format.number(data.distribution.servers.length),
      icon: Server,
    },
  ]

  return (
    <section>
      <h2 className="text-[clamp(1.05rem,2.2vh,1.25rem)] font-semibold tracking-tight">
        {t('stats.title')}
      </h2>
      <p className="mt-1 text-[clamp(0.75rem,1.4vh,0.875rem)] text-fg-muted">{t('stats.subtitle')}</p>

        <div className="mt-[clamp(0.5rem,1.2vh,1rem)] grid grid-cols-2 gap-[clamp(0.5rem,1.2vh,1rem)] lg:grid-cols-6 lg:gap-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.id} className="p-[clamp(0.65rem,1.4vh,1rem)] lg:p-3">
              <div className="flex items-center gap-2">
                <Icon aria-hidden className="size-[clamp(1rem,2.2vh,1.25rem)] shrink-0 text-accent-300" />
                <p className="min-w-0 text-[clamp(0.75rem,1.4vh,0.875rem)] leading-tight text-fg-subtle">
                  {item.label}
                </p>
              </div>
              <p className="tabular mt-[clamp(0.35rem,1vh,0.75rem)] text-[clamp(1.15rem,2.6vh,1.5rem)] font-semibold tracking-tight">
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
