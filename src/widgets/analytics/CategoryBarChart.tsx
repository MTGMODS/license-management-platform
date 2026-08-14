import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'

import {
  AXIS_PROPS,
  barActiveProps,
  CATEGORY_BAR_SIZE,
  CATEGORY_CHART_MARGIN,
  CATEGORY_Y_WIDTH,
  categoryChartHeight,
  CHART,
} from './chartTheme'

interface CategoryBarChartProps<T> {
  data: readonly T[]
  dataKey: string
  color: string
  className?: string
  renderTooltip: (point: T) => ReactNode
}

export function CategoryBarChart<T>({
  data,
  dataKey,
  color,
  className,
  renderTooltip,
}: CategoryBarChartProps<T>) {
  const format = useFormatters()

  return (
    <div className={cn('mt-6', className)} style={{ height: categoryChartHeight(data.length) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer={false}
          data={data}
          layout="vertical"
          margin={CATEGORY_CHART_MARGIN}
          barSize={CATEGORY_BAR_SIZE}
          barCategoryGap={8}
        >
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis type="number" {...AXIS_PROPS} tickFormatter={format.compact} />
          <YAxis
            type="category"
            dataKey="label"
            interval={0}
            {...AXIS_PROPS}
            width={CATEGORY_Y_WIDTH}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as T | undefined
              if (!active || !point) return null
              return renderTooltip(point)
            }}
          />
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            maxBarSize={CATEGORY_BAR_SIZE}
            activeBar={barActiveProps(color)}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
