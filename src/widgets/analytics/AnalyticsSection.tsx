import { useTranslation } from 'react-i18next'

import { usePublicStats } from '@/features/usage/usePublicStats'
import { Card, Skeleton } from '@/shared/ui'

import { ActivityCharts } from './ActivityCharts'
import { DailyTrends } from './DailyTrends'
import { FactionsChart, VersionsChart } from './DistributionCharts'
import { ServersChart } from './ServersChart'
import { WorldMap } from './WorldMap'

export function AnalyticsSection() {
  const { t } = useTranslation('helper')
  const { data, isPending, isError } = usePublicStats()

  return (
    <section>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t('analytics.title')}</h2>
        <p className="mt-2 text-fg-muted">{t('analytics.subtitle')}</p>
      </div>

      {isPending ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-80" label={t('analytics.loading')} />
          <Skeleton className="h-72" />
        </div>
      ) : isError || !data ? (
        <Card className="mt-6 p-6">
          <p className="text-sm text-fg-muted">{t('analytics.error')}</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          <WorldMap countries={data.distribution.countries} />
          <ServersChart servers={data.distribution.servers} />
          <DailyTrends daily={data.analytics.timeline.daily} />
          <ActivityCharts
            hourly={data.analytics.activity.hourly}
            weekday={data.analytics.activity.weekday}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <FactionsChart factions={data.distribution.factions} />
            <VersionsChart versions={data.distribution.versions} />
          </div>
        </div>
      )}
    </section>
  )
}
