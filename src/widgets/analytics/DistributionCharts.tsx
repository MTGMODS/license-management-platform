import { useTranslation } from 'react-i18next'

import type { FactionStats, PeriodKey, VersionStats } from '@/shared/api/usage'
import { useFormatters } from '@/shared/lib/format'
import { Card } from '@/shared/ui'

import { CategoryBarChart } from './CategoryBarChart'
import { type ChartMetric, chartColor } from './chartTheme'
import { ChartTooltip, statsTooltipRows } from './ChartTooltip'

/**
 * Faction codes the payload can return. Anything outside this list falls back
 * to the raw code rather than being guessed at, so a faction added on the
 * backend shows up honestly instead of silently mislabelled.
 */
const KNOWN_FACTIONS = [
  'none',
  'police',
  'gov',
  'army',
  'hospital',
  'mafia',
  'ghetto',
  'smi',
  'prison',
  'fbi',
  'fd',
  'judge',
  'lc',
  'ins',
] as const

type KnownFaction = (typeof KNOWN_FACTIONS)[number]

function isKnownFaction(code: string): code is KnownFaction {
  return (KNOWN_FACTIONS as readonly string[]).includes(code)
}

interface FactionRow {
  mode: string
  label: string
  users: number
  launches: number
  user_share: number
  launches_per_user: number
  vip_percent: number
}

export function FactionsChart({
  factions,
  period,
  metric,
}: {
  factions: FactionStats[]
  period: PeriodKey
  metric: ChartMetric
}) {
  const { t } = useTranslation('helper')
  const format = useFormatters()
  const color = chartColor(metric)

  const rows: FactionRow[] = factions
    .map((stats) => ({
      mode: stats.mode,
      label: isKnownFaction(stats.mode)
        ? t(`analytics.factionName.${stats.mode}`)
        : stats.mode.toUpperCase(),
      users: stats.users[period],
      launches: stats.launches[period],
      user_share: stats.user_share[period],
      launches_per_user: stats.launches_per_user[period],
      vip_percent: stats.vip_percent[period],
    }))
    .filter((row) => row[metric] > 0)
    .sort((a, b) => b[metric] - a[metric])

  return (
    <Card className="p-4 text-left sm:p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('analytics.factions.title')}</h3>
      <p className="mt-1 text-sm text-fg-muted">{t('analytics.factions.subtitle')}</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('analytics.empty')}</p>
      ) : (
        <CategoryBarChart
          data={rows}
          dataKey={metric}
          color={color}
          renderTooltip={(point) => (
            <ChartTooltip
              title={point.label}
              rows={statsTooltipRows(t, format, {
                users: point.users,
                launches: point.launches,
                user_share: point.user_share,
                launches_per_user: point.launches_per_user,
                vip_percent: point.vip_percent,
              })}
            />
          )}
        />
      )}
    </Card>
  )
}

/**
 * Version strings are reported by the client and include typos and edited
 * builds ("1337", "1.8.9 Vip fix"), each with a couple of users. Showing every
 * one would bury the real releases, so the long tail is collapsed.
 */
const VERSION_TAIL_THRESHOLD = 0.5

export function VersionsChart({
  versions,
  period,
  metric,
}: {
  versions: VersionStats[]
  period: PeriodKey
  metric: ChartMetric
}) {
  const { t } = useTranslation('helper')
  const format = useFormatters()
  const color = chartColor(metric)

  const main = versions.filter((item) => item.user_share[period] >= VERSION_TAIL_THRESHOLD)
  const tail = versions.filter((item) => item.user_share[period] < VERSION_TAIL_THRESHOLD)

  const rows = [
    ...main.map((item) => ({
      label: item.version,
      users: item.users[period],
      launches: item.launches[period],
      user_share: item.user_share[period],
      launches_per_user: item.launches_per_user[period],
    })),
    ...(tail.length > 0
      ? [
          (() => {
            const users = tail.reduce((sum, item) => sum + item.users[period], 0)
            const launches = tail.reduce((sum, item) => sum + item.launches[period], 0)
            return {
              label: t('analytics.versions.other'),
              users,
              launches,
              user_share: tail.reduce((sum, item) => sum + item.user_share[period], 0),
              // Collapsed tail has no backend row; L/U follows the same formula.
              launches_per_user: users > 0 ? launches / users : 0,
            }
          })(),
        ]
      : []),
  ]
    .filter((row) => row[metric] > 0)
    .sort((a, b) => b[metric] - a[metric])

  return (
    <Card className="p-4 text-left sm:p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('analytics.versions.title')}</h3>
      <p className="mt-1 text-sm text-fg-muted">{t('analytics.versions.subtitle')}</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('analytics.empty')}</p>
      ) : (
        <CategoryBarChart
          data={rows}
          dataKey={metric}
          color={color}
          renderTooltip={(point) => (
            <ChartTooltip title={point.label} rows={statsTooltipRows(t, format, point)} />
          )}
        />
      )}
    </Card>
  )
}
