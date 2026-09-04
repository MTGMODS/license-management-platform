import type { TFunction } from 'i18next'

import type { Formatters } from '@/shared/lib/format'

import { CHART } from './chartTheme'
import type { TooltipRow } from './ChartTooltip'

export interface StatsTooltipValues {
  users: number
  launches: number
  vip_users?: number
  user_share?: number
  launches_per_user?: number
  vip_percent?: number
}

/** Users, VIP users, launches, then U/S, VIP share, L/U. */
export function statsTooltipRows(
  t: TFunction<'helper'>,
  format: Formatters,
  stats: StatsTooltipValues,
): TooltipRow[] {
  const rows: TooltipRow[] = [
    {
      label: t('analytics.metric.users'),
      value: format.number(stats.users),
      color: CHART.users,
    },
  ]

  if (stats.vip_users != null) {
    rows.push({
      label: t('analytics.metric.vipUsers'),
      value: format.number(stats.vip_users),
      color: CHART.vip,
    })
  }

  rows.push({
    label: t('analytics.metric.launches'),
    value: format.number(stats.launches),
    color: CHART.launches,
  })

  if (stats.user_share != null) {
    rows.push({
      label: t('analytics.metric.share'),
      value: format.percent(stats.user_share),
      color: CHART.share,
    })
  }

  if (stats.vip_percent != null) {
    rows.push({
      label: t('analytics.metric.vipShare'),
      value: format.percent(stats.vip_percent),
      color: CHART.share,
    })
  }

  if (stats.launches_per_user != null) {
    rows.push({
      label: t('analytics.metric.perUser'),
      value: format.decimal(stats.launches_per_user),
      color: CHART.perUser,
    })
  }

  return rows
}
