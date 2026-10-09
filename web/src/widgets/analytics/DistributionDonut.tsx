import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { useFormatters } from '@/shared/lib/format'

import type { ChartMetric } from './chartTheme'

const COLORS = ['#0fb0fa', '#34d399', '#a78bfa', '#fbbf24', '#fb7185', '#2dd4bf', '#818cf8', '#94a3b8']

export function DistributionDonut({ rows, metric }: {
  rows: { label: string; users: number; launches: number }[]
  metric: ChartMetric
}) {
  const format = useFormatters()
  const total = rows.reduce((sum, row) => sum + row[metric], 0)

  return (
    <div className="mt-5">
      <div className="mx-auto h-56 w-full max-w-xs">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey={metric} nameKey="label" innerRadius="60%" outerRadius="85%" paddingAngle={2} stroke="none">
              {rows.map((row, index) => <Cell key={row.label} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (typeof rows)[number] | undefined
              if (!active || !point) return null
              return <div className="glass bevel rounded-xl p-3 text-sm shadow-lg">
                <p className="font-semibold">{point.label}</p>
                <p className="mt-1 text-fg-muted">{format.number(point[metric])} · {format.percent(total > 0 ? point[metric] / total * 100 : 0)}</p>
              </div>
            }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((row, index) => <li key={row.label} className="flex items-center gap-2 text-sm">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
          <span className="min-w-0 flex-1 break-words text-fg-muted">{row.label}</span>
          <span className="tabular font-medium">{format.number(row[metric])}</span>
          <span className="tabular w-16 text-right text-fg-subtle">{format.percent(total > 0 ? row[metric] / total * 100 : 0)}</span>
        </li>)}
      </ul>
    </div>
  )
}
