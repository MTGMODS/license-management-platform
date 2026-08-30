import { useLayoutEffect, type ReactNode } from 'react'

import { resolveTooltipTranslateX } from './chartTooltipPosition'

export type RechartsTooltipContentProps<T> = {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: T }>
  coordinate?: { x: number; y: number }
  viewBox?: { width?: number; height?: number; x?: number; y?: number }
  chartContainerWidth?: number
  resolveTranslateX?: (coordinateX: number, width: number) => number | undefined
  renderTooltip: (point: T) => ReactNode
  onTranslateX: (x: number | undefined) => void
}

/** Bridges Recharts tooltip props to centered/clamped horizontal placement on narrow charts. */
export function RechartsTooltipContent<T>({
  active,
  payload,
  coordinate,
  viewBox,
  chartContainerWidth = 0,
  resolveTranslateX = resolveTooltipTranslateX,
  renderTooltip,
  onTranslateX,
}: RechartsTooltipContentProps<T>) {
  useLayoutEffect(() => {
    if (!active || !coordinate) {
      onTranslateX(undefined)
      return
    }

    const width = chartContainerWidth > 0 ? chartContainerWidth : viewBox?.width
    if (width == null || width <= 0) {
      onTranslateX(undefined)
      return
    }

    onTranslateX(resolveTranslateX(coordinate.x, width))
  }, [
    active,
    chartContainerWidth,
    coordinate,
    onTranslateX,
    resolveTranslateX,
    viewBox?.width,
  ])

  const point = payload?.[0]?.payload
  if (!active || point == null) return null
  return renderTooltip(point)
}
