import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePublicStats } from '@/features/usage/usePublicStats'
import type { PeriodKey } from '@/shared/api/usage'
import { Skeleton } from '@/shared/ui'

import { ActivityCharts } from './ActivityCharts'
import type { ChartMetric } from './chartTheme'
import { DailyTrends } from './DailyTrends'
import { DevicesChart } from './DevicesChart'
import { FactionsChart, VersionsChart } from './DistributionCharts'
import { MetricControl } from './MetricControl'
import { PeriodControl } from './PeriodControl'
import { ServersChart } from './ServersChart'
import { WorldMap } from './WorldMap'

export function AnalyticsSection() {
  const { t } = useTranslation('helper')
  const { data, isPending, isError } = usePublicStats()
  const [period, setPeriod] = useState<PeriodKey>('all_time')
  const [metric, setMetric] = useState<ChartMetric>('users')

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
      <div className="flex flex-col items-stretch gap-4 text-left sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight">{t('analytics.title')}</h2>
          <p className="mt-2 text-fg-muted">{t('analytics.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MetricControl value={metric} onChange={setMetric} />
          <PeriodControl value={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <FactionsChart factions={data.distribution.factions} period={period} metric={metric} />
        <ServersChart
          servers={data.distribution.servers}
          products={data.distribution.products}
          period={period}
          metric={metric}
        />
        <WorldMap countries={data.distribution.countries} period={period} metric={metric} />
        <DevicesChart devices={data.overview.devices} period={period} metric={metric} />
        <VersionsChart versions={data.distribution.versions} period={period} metric={metric} />
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">{t('analytics.allTimeSection.title')}</h2>
        <p className="mt-2 text-fg-muted">{t('analytics.allTimeSection.subtitle')}</p>
      </div>

      <div className="mt-6 space-y-4">
        <DailyTrends
          daily={data.analytics.timeline.daily}
          hourly={data.analytics.timeline.hourly}
          metric={metric}
        />
        <ActivityCharts
          hourly={data.analytics.activity.hourly}
          weekday={data.analytics.activity.weekday}
          metric={metric}
        />
      </div>
    </section>
  )
}
