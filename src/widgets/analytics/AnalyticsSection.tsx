import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePublicStats } from '@/features/usage/usePublicStats'
import { PERIOD_KEYS, type PeriodKey } from '@/shared/api/usage'
import { Card, SegmentedControl, Skeleton } from '@/shared/ui'

import { ActivityCharts } from './ActivityCharts'
import { DailyTrends } from './DailyTrends'
import { ServersChart } from './ServersChart'

export function AnalyticsSection() {
  const { t } = useTranslation('helper')
  const { data, isPending, isError } = usePublicStats()
  const [period, setPeriod] = useState<PeriodKey>('all_time')

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('analytics.title')}</h2>
          <p className="mt-2 text-fg-muted">{t('analytics.subtitle')}</p>
        </div>

        <SegmentedControl
          label={t('analytics.period.label')}
          value={period}
          onChange={setPeriod}
          options={PERIOD_KEYS.map((key) => ({
            id: key,
            label: t(`analytics.period.${key}`),
          }))}
        />
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
          <ServersChart servers={data.distribution.servers} period={period} />
          <DailyTrends daily={data.analytics.timeline.daily} />
          <ActivityCharts
            hourly={data.analytics.activity.hourly}
            weekday={data.analytics.activity.weekday}
          />
        </div>
      )}
    </section>
  )
}
