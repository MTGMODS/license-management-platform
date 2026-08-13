import type { TFunction } from 'i18next'
import type { ReactNode } from 'react'

import type { Formatters } from '@/shared/lib/format'

import { CHART } from './chartTheme'

export interface TooltipRow {
  label: string
  value: string
  color?: string
}

export interface StatsTooltipValues {
  users: number
  launches: number
  user_share?: number
  launches_per_user?: number
  vip_percent?: number
}

/** Users / launches, then U/S, VIP, L/U — same order and colours on every chart. */
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
    {
      label: t('analytics.metric.launches'),
      value: format.number(stats.launches),
      color: CHART.launches,
    },
  ]

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
      color: CHART.vip,
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

/**
 * Shared tooltip body. Recharts' default is a light card with raw dataKey
 * names, which neither matches the dark surface nor reads as human language.
 */
export function ChartTooltip({ title, rows }: { title: ReactNode; rows: TooltipRow[] }) {
  return (
    <div className="glass bevel rounded-xl px-3.5 py-2.5 text-sm shadow-xl">
      <p className="font-medium text-fg">{title}</p>
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-fg-muted">
            {row.color ? (
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
            ) : null}
            <span>{row.label}</span>
            <span className="tabular ml-auto pl-4 font-medium text-fg">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
