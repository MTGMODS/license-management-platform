import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { PeriodKey, ProductKey, ProductStats, ServerStats } from '@/shared/api/usage'
import { formatServerLabel, getServer, UNKNOWN_SERVER_ID } from '@/shared/config/servers'
import { useFormatters } from '@/shared/lib/format'
import { Card, SegmentedControl } from '@/shared/ui'

import { AXIS_PROPS, barActiveProps, CHART, type ChartMetric, chartColor } from './chartTheme'
import { ChartTooltip, statsTooltipRows } from './ChartTooltip'

type TopLimit = 5 | 10 | 20 | 0

const KNOWN_PRODUCTS = [
  'arizona_pc',
  'arizona_mobile',
  'rodina_pc',
  'rodina_mobile',
] as const satisfies readonly ProductKey[]

function isKnownProduct(value: string): value is ProductKey {
  return (KNOWN_PRODUCTS as readonly string[]).includes(value)
}

interface ServersChartProps {
  servers: ServerStats[]
  products: ProductStats[]
  period: PeriodKey
  metric: ChartMetric
}

function ProductsChart({
  products,
  period,
  metric,
}: {
  products: ProductStats[]
  period: PeriodKey
  metric: ChartMetric
}) {
  const { t } = useTranslation('helper')
  const format = useFormatters()
  const color = chartColor(metric)

  const rows = [...products]
    .map((item) => ({
      ...item,
      label: isKnownProduct(item.product)
        ? t(`analytics.servers.products.name.${item.product}`)
        : item.product,
    }))
    .filter((item) => item[metric][period] > 0)
    .sort((a, b) => b[metric][period] - a[metric][period])

  if (rows.length === 0) return null

  return (
    <div className="mt-6 border-t border-white/5 pt-5">
      <div style={{ height: Math.max(160, rows.length * 36 + 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
          >
            <CartesianGrid stroke={CHART.grid} horizontal={false} />
            <XAxis type="number" {...AXIS_PROPS} tickFormatter={format.compact} />
            <YAxis type="category" dataKey="label" {...AXIS_PROPS} width={148} />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as (typeof rows)[number] | undefined
                if (!active || !point) return null

                return (
                  <ChartTooltip
                    title={point.label}
                    rows={statsTooltipRows(t, format, {
                      users: point.users[period],
                      launches: point.launches[period],
                      user_share: point.user_share[period],
                      launches_per_user: point.launches_per_user[period],
                    })}
                  />
                )
              }}
            />
            <Bar
              dataKey={`${metric}.${period}`}
              fill={color}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
              activeBar={barActiveProps(color)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function ServersChart({ servers, products, period, metric }: ServersChartProps) {
  const { t } = useTranslation('helper')
  const format = useFormatters()
  const [limit, setLimit] = useState<TopLimit>(10)
  const color = chartColor(metric)

  const named = servers.map((item) => {
    const info = getServer(item.server)

    return {
      ...item,
      label:
        item.server === UNKNOWN_SERVER_ID
          ? t('analytics.servers.unknown')
          : formatServerLabel(
              item.server,
              info?.name ?? t('analytics.servers.name', { id: item.server }),
            ),
      project: info ? t(`analytics.servers.project.${info.project}`) : null,
    }
  })

  const ranked = named
    .sort((a, b) => b[metric][period] - a[metric][period])
    .filter((item) => item[metric][period] > 0)

  const visible = limit === 0 ? ranked : ranked.slice(0, limit)

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{t('analytics.servers.title')}</h3>
          <p className="mt-1 text-sm text-fg-muted">{t('analytics.servers.subtitle')}</p>
        </div>

        <SegmentedControl
          size="sm"
          label={t('analytics.servers.title')}
          value={limit}
          onChange={setLimit}
          options={[
            { id: 5, label: t('analytics.servers.top', { count: 5 }) },
            { id: 10, label: t('analytics.servers.top', { count: 10 }) },
            { id: 20, label: t('analytics.servers.top', { count: 20 }) },
            { id: 0, label: t('analytics.servers.all') },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('analytics.empty')}</p>
      ) : (
        // Horizontal bars with a row-proportional height: 45 servers would be
        // unreadable squeezed into a fixed box.
        <div className="mt-6" style={{ height: Math.max(220, visible.length * 26 + 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              accessibilityLayer={false}
              data={visible}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
            >
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" {...AXIS_PROPS} tickFormatter={format.compact} />
              {/* Names run to "Санкт Петербург", so the axis is wider than a
                  numeric id would need. */}
              <YAxis type="category" dataKey="label" {...AXIS_PROPS} width={148} />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as (typeof visible)[number] | undefined
                  if (!active || !point) return null

                  return (
                    <ChartTooltip
                      title={point.project ? `${point.label} · ${point.project}` : point.label}
                      rows={statsTooltipRows(t, format, {
                        users: point.users[period],
                        launches: point.launches[period],
                        user_share: point.user_share[period],
                        launches_per_user: point.launches_per_user[period],
                      })}
                    />
                  )
                }}
              />
              <Bar
                dataKey={`${metric}.${period}`}
                fill={color}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
                activeBar={barActiveProps(color)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <ProductsChart products={products} period={period} metric={metric} />
    </Card>
  )
}
