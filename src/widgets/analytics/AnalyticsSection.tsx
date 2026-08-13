import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePublicStats } from '@/features/usage/usePublicStats'
import type { PeriodKey } from '@/shared/api/usage'
import { Skeleton } from '@/shared/ui'

import { ActivityCharts } from './ActivityCharts'
import { DailyTrends } from './DailyTrends'
import { DevicesChart } from './DevicesChart'
import { FactionsChart, VersionsChart } from './DistributionCharts'
import { PeriodControl } from './PeriodControl'
import { ServersChart } from './ServersChart'
import { WorldMap } from './WorldMap'

export function AnalyticsSection() {
  const { t } = useTranslation('helper')
  const { data, isPending, isError } = usePublicStats()
  const [period, setPeriod] = useState<PeriodKey>('all_time')

  if (isError) return null

  if (!data) {
    if (!isPending) return null

    return (
      <section>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('analytics.title')}</h2>
          <p className="mt-2 text-fg-muted">{t('analytics.subtitle')}</p>
        </div>
        <div className="mt-6 space-y-4">
          <Skeleton className="h-80" label={t('analytics.loading')} />
          <Skeleton className="h-72" />
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('analytics.title')}</h2>
          <p className="mt-2 text-fg-muted">{t('analytics.subtitle')}</p>
        </div>
        <PeriodControl value={period} onChange={setPeriod} />
      </div>

      <div className="mt-6 space-y-4">
        <FactionsChart factions={data.distribution.factions} period={period} />
        <ServersChart
          servers={data.distribution.servers}
          products={data.distribution.products}
          period={period}
        />
        <WorldMap countries={data.distribution.countries} period={period} />
        <DevicesChart devices={data.overview.devices} period={period} />
        <VersionsChart versions={data.distribution.versions} period={period} />
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">{t('analytics.allTimeSection.title')}</h2>
        <p className="mt-2 text-fg-muted">{t('analytics.allTimeSection.subtitle')}</p>
      </div>

      <div className="mt-6 space-y-4">
        <DailyTrends daily={data.analytics.timeline.daily} />
        <ActivityCharts
          hourly={data.analytics.activity.hourly}
          weekday={data.analytics.activity.weekday}
        />
      </div>
    </section>
  )
}
