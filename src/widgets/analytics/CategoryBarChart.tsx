import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
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
import {
  CHART_TOOLTIP_WRAPPER_STYLE,
  readTooltipViewBox,
  resolveCategoryBarTooltipTranslateX,
} from './chartTooltipPosition'
import { RechartsTooltipContent } from './RechartsTooltipContent'
import { useChartContainerWidth } from './useChartContainerWidth'

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
  const [tooltipX, setTooltipX] = useState<number | undefined>()
  const containerRef = useRef<HTMLDivElement>(null)
  const containerWidth = useChartContainerWidth(containerRef)
  const plotLeft = CATEGORY_Y_WIDTH + CATEGORY_CHART_MARGIN.left

  return (
    <div
      ref={containerRef}
      className={cn('mt-6', className)}
      style={{ height: categoryChartHeight(data.length) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer={false}
          data={data}
          layout="vertical"
          margin={CATEGORY_CHART_MARGIN}
          barSize={CATEGORY_BAR_SIZE}
          barCategoryGap={12}
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
            offset={8}
            position={tooltipX != null ? { x: tooltipX } : undefined}
            wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
            content={(props) => (
              <RechartsTooltipContent
                active={props.active}
                payload={props.payload as ReadonlyArray<{ payload?: T }> | undefined}
                coordinate={props.coordinate}
                viewBox={readTooltipViewBox(props)}
                chartContainerWidth={containerWidth}
                resolveTranslateX={(_coordinateX, width) =>
                  resolveCategoryBarTooltipTranslateX(
                    width,
                    plotLeft,
                    CATEGORY_CHART_MARGIN.right,
                  )
                }
                renderTooltip={renderTooltip}
                onTranslateX={setTooltipX}
              />
            )}
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
