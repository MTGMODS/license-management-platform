/** Below this container width, category bar tooltips anchor to the plot center. */
export const NARROW_CHART_WIDTH = 520

/** Rough half-width before the tooltip is measured (ChartTooltip ≈ 260px). */
const TOOLTIP_HALF_WIDTH = 132

/**
 * Recharts `position.x` is translateX in SVG space (not the pointer).
 * Used by line/area charts when viewBox width is known.
 */
export function resolveTooltipTranslateX(
  _coordinateX: number,
  chartWidth: number,
): number | undefined {
  if (chartWidth >= NARROW_CHART_WIDTH) return undefined

  return chartWidth / 2 - TOOLTIP_HALF_WIDTH
}

/**
 * Horizontal bar charts (layout=vertical): plot area starts after the Y-axis gutter.
 * Recharts v3 does not pass viewBox into custom tooltip content, so derive from container width.
 */
export function resolveCategoryBarTooltipTranslateX(
  containerWidth: number,
  plotLeft: number,
  plotRightMargin: number,
): number | undefined {
  if (containerWidth >= NARROW_CHART_WIDTH) return undefined

  const plotWidth = Math.max(containerWidth - plotLeft - plotRightMargin, 0)
  return plotLeft + plotWidth / 2 - TOOLTIP_HALF_WIDTH
}

/** Clamps a pointer-relative X for absolutely positioned overlays (world map). */
export function clampTooltipAnchorX(x: number, containerWidth: number): number {
  if (containerWidth < NARROW_CHART_WIDTH) {
    return containerWidth / 2
  }

  const pad = 12
  const minX = TOOLTIP_HALF_WIDTH + pad
  const maxX = containerWidth - TOOLTIP_HALF_WIDTH - pad
  return Math.min(Math.max(x, minX), maxX)
}

export const CHART_TOOLTIP_WRAPPER_STYLE = {
  zIndex: 20,
  pointerEvents: 'none',
} as const

type TooltipViewBox = { width?: number; height?: number; x?: number; y?: number }

export function readTooltipViewBox(props: object): TooltipViewBox | undefined {
  if (!('viewBox' in props)) return undefined
  const viewBox = (props as { viewBox?: unknown }).viewBox
  if (!viewBox || typeof viewBox !== 'object') return undefined
  return viewBox as TooltipViewBox
}
