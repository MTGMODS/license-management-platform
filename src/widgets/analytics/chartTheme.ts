/**
 * Recharts takes colours as literal SVG attributes rather than classes, so the
 * palette is mirrored here from the design tokens in index.css.
 */
export const CHART = {
  users: '#7c5cff',
  usersSoft: '#b8a8ff',
  launches: '#34d399',
  grid: 'rgba(244, 245, 248, 0.06)',
  axis: '#6a6a83',
  cursor: 'rgba(244, 245, 248, 0.05)',
} as const

export const AXIS_PROPS = {
  stroke: CHART.axis,
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const

/** Numeric Y axes: auto width from tick labels (e.g. "2,5 тис."). */
export const Y_AXIS_NUMERIC = {
  ...AXIS_PROPS,
  width: 'auto' as const,
}

/** Shared hover outline for chart bars and map countries. */
export const HOVER_OUTLINE = {
  stroke: 'rgba(244, 245, 248, 0.55)',
  strokeWidth: 1.5,
} as const

/** Hover outline on the bar itself — not the full-row tooltip band. */
export function barActiveProps(fill: string) {
  return {
    fill,
    ...HOVER_OUTLINE,
  } as const
}
