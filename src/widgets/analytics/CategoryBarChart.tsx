import type { ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'

import {
  AXIS_PROPS,
  barActiveProps,
  CATEGORY_BAR_SIZE,
  categoryBarAxisLayout,
  categoryChartHeight,
  CHART,
  formatCategoryAxisLabel,
} from './chartTheme'
import {
  CHART_TOOLTIP_WRAPPER_STYLE,
  readTooltipViewBox,
  resolveCategoryBarTooltipTranslateX,
} from './chartTooltipPosition'
import { RechartsTooltipContent } from './RechartsTooltipContent'
import { useChartContainerWidth } from './useChartContainerWidth'
import { useExclusiveAnalyticsTooltip } from './useExclusiveAnalyticsTooltip'

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
  const tooltip = useExclusiveAnalyticsTooltip()
  const containerRef = useRef<HTMLDivElement>(null)
  const containerWidth = useChartContainerWidth(containerRef)
  const axis = categoryBarAxisLayout(containerWidth)
  const assignContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node
      tooltip.surfaceRef(node)
    },
    [tooltip.surfaceRef],
  )

  return (
    <div
      ref={assignContainerRef}
      className={cn('mt-6', className)}
      style={{ height: categoryChartHeight(data.length) }}
      {...tooltip.surfaceProps}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer={false}
          data={data}
          layout="vertical"
          margin={axis.margin}
          barSize={CATEGORY_BAR_SIZE}
          barCategoryGap={12}
        >
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis type="number" {...AXIS_PROPS} tickFormatter={format.compact} />
          <YAxis
            type="category"
            dataKey="label"
            interval={0}
            stroke={AXIS_PROPS.stroke}
            tickLine={AXIS_PROPS.tickLine}
            axisLine={AXIS_PROPS.axisLine}
            width={axis.yWidth}
            tick={{ fill: CHART.axis, fontSize: axis.fontSize }}
            tickFormatter={(label) => formatCategoryAxisLabel(String(label), axis.compact)}
          />
          <Tooltip
            cursor={false}
            offset={8}
            trigger={tooltip.trigger}
            active={tooltip.tooltipActive}
            position={tooltipX != null ? { x: tooltipX } : undefined}
            wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
            content={(props) => (
              <RechartsTooltipContent
                active={props.active}
                payload={props.payload as ReadonlyArray<{ payload?: T }> | undefined}
                coordinate={props.coordinate}
                viewBox={readTooltipViewBox(props)}
                chartContainerWidth={containerWidth}
                onClaim={tooltip.claim}
                onPin={tooltip.coarse ? tooltip.pin : undefined}
                onRelease={tooltip.coarse ? tooltip.dismiss : undefined}
                suppressed={tooltip.suppressed}
                resolveTranslateX={(_coordinateX, width) =>
                  resolveCategoryBarTooltipTranslateX(
                    width,
                    axis.plotLeft,
                    axis.margin.right,
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
