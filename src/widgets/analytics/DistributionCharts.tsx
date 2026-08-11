import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { FactionStats, VersionStats } from '@/shared/api/usage'
import { useFormatters } from '@/shared/lib/format'
import { Card } from '@/shared/ui'

import { AXIS_PROPS, CHART } from './chartTheme'
import { ChartTooltip } from './ChartTooltip'

/**
 * Faction codes the payload can return. Anything outside this list falls back
 * to the raw code rather than being guessed at, so a faction added on the
 * backend shows up honestly instead of silently mislabelled.
 */
const KNOWN_FACTIONS = [
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
] as const

type KnownFaction = (typeof KNOWN_FACTIONS)[number]

function isKnownFaction(code: string): code is KnownFaction {
  return (KNOWN_FACTIONS as readonly string[]).includes(code)
}

interface FactionRow extends FactionStats {
  code: string
  label: string
}

export function FactionsChart({ factions }: { factions: Record<string, FactionStats> }) {
  const { t } = useTranslation('helper')
  const format = useFormatters()

  const rows: FactionRow[] = Object.entries(factions)
    .map(([code, stats]) => ({
      ...stats,
      code,
      label: isKnownFaction(code) ? t(`analytics.factionName.${code}`) : code.toUpperCase(),
    }))
    .sort((a, b) => b.total_users - a.total_users)

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('analytics.factions.title')}</h3>
      <p className="mt-1 text-sm text-fg-muted">{t('analytics.factions.subtitle')}</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('analytics.empty')}</p>
      ) : (
        <div className="mt-6" style={{ height: Math.max(220, rows.length * 30 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
            >
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" {...AXIS_PROPS} tickFormatter={format.compact} />
              <YAxis type="category" dataKey="label" {...AXIS_PROPS} width={104} />
              <Tooltip
                cursor={{ fill: CHART.cursor }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as FactionRow | undefined
                  if (!active || !point) return null

                  return (
                    <ChartTooltip
                      title={point.label}
                      rows={[
                        {
                          label: t('analytics.factions.users'),
                          value: format.number(point.total_users),
                          color: CHART.users,
                        },
                        {
                          label: t('analytics.factions.share'),
                          value: format.percent(point.user_share),
                        },
                        {
                          label: t('analytics.factions.vipShare'),
                          value: format.percent(point.vip_percent),
                        },
                        {
                          label: t('analytics.factions.perUser'),
                          value: format.decimal(point.launches_per_user),
                        },
                      ]}
                    />
                  )
                }}
              />
              <Bar
                dataKey="total_users"
                fill={CHART.users}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
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

export function VersionsChart({ versions }: { versions: VersionStats[] }) {
  const { t } = useTranslation('helper')
  const format = useFormatters()

  const main = versions.filter((item) => item.user_share >= VERSION_TAIL_THRESHOLD)
  const tail = versions.filter((item) => item.user_share < VERSION_TAIL_THRESHOLD)

  const rows = [
    ...main.map((item) => ({ label: item.version, users: item.users })),
    ...(tail.length > 0
      ? [
          {
            label: t('analytics.versions.other'),
            users: tail.reduce((sum, item) => sum + item.users, 0),
          },
        ]
      : []),
  ].sort((a, b) => b.users - a.users)

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t('analytics.versions.title')}</h3>
      <p className="mt-1 text-sm text-fg-muted">{t('analytics.versions.subtitle')}</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('analytics.empty')}</p>
      ) : (
        <div className="mt-6" style={{ height: Math.max(220, rows.length * 30 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
            >
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" {...AXIS_PROPS} tickFormatter={format.compact} />
              <YAxis type="category" dataKey="label" {...AXIS_PROPS} width={132} />
              <Tooltip
                cursor={{ fill: CHART.cursor }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as { label: string; users: number } | undefined
                  if (!active || !point) return null

                  return (
                    <ChartTooltip
                      title={point.label}
                      rows={[
                        {
                          label: t('analytics.versions.users'),
                          value: format.number(point.users),
                          color: CHART.launches,
                        },
                      ]}
                    />
                  )
                }}
              />
              <Bar
                dataKey="users"
                fill={CHART.launches}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
