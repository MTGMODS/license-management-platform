import { useLayoutEffect, useRef, type ReactNode } from 'react'

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
  onClaim?: () => void
  onRelease?: () => void
  onPin?: () => void
  /** Hidden by the shared coordinator; do not release ownership on this transition. */
  suppressed?: boolean
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
  onClaim,
  onRelease,
  onPin,
  suppressed = false,
}: RechartsTooltipContentProps<T>) {
  const wasActive = useRef(false)
  const visible = Boolean(active) && !suppressed

  useLayoutEffect(() => {
    if (visible && !wasActive.current) {
      onPin?.()
      onClaim?.()
    }
    if (!visible && wasActive.current && !suppressed) onRelease?.()
    wasActive.current = visible
  }, [visible, suppressed, onClaim, onPin, onRelease])

  useLayoutEffect(() => {
    if (!visible || !coordinate) {
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
    visible,
    chartContainerWidth,
    coordinate,
    onTranslateX,
    resolveTranslateX,
    viewBox?.width,
  ])

  const point = payload?.[0]?.payload
  if (!visible || point == null) return null
  return renderTooltip(point)
}
