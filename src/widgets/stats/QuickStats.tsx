import { ArrowDown, Crown, Globe2, Rocket, Server, Users } from 'lucide-react'
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

  const items: StatItem[] = data
    ? [
        {
          id: 'users',
          label: t('stats.users'),
          value: format.number(data.overview.users.total.all_time),
          icon: Users,
        },
        {
          id: 'vip',
          label: t('stats.vip'),
          value: format.number(data.overview.users.vip.all_time),
          icon: Crown,
        },
        {
          id: 'launches',
          label: t('stats.launches'),
          value: format.number(data.overview.launches.all_time),
          icon: Rocket,
        },
        {
          id: 'countries',
          label: t('stats.countries'),
          // GeoIP failures are bucketed under a literal UNKNOWN code, which is
          // not a country and would inflate the count.
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
    : []

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">{t('stats.title')}</h2>
      <p className="mt-2 text-fg-muted">{t('stats.subtitle')}</p>

      {isPending ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-28"
              label={index === 0 ? t('stats.loading') : undefined}
            />
          ))}
        </div>
      ) : isError || !data ? (
        <Card className="mt-6 p-6">
          <p className="text-sm text-fg-muted">{t('stats.error')}</p>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.id} className="p-5">
                  <Icon aria-hidden className="size-5 text-accent-300" />
                  <p className="tabular mt-4 text-3xl font-semibold tracking-tight">{item.value}</p>
                  <p className="mt-1 text-sm text-fg-subtle">{item.label}</p>
                </Card>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-fg-subtle">
            <span>{t('stats.updated', { time: format.dateTime(data.updated_at) })}</span>
            <span className="inline-flex items-center gap-1.5">
              <ArrowDown aria-hidden className="size-4" />
              {t('stats.more')}
            </span>
          </div>
        </>
      )}
    </section>
  )
}
