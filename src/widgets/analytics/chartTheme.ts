/**
 * Recharts takes colours as literal SVG attributes rather than classes, so the
 * palette is mirrored here from the design tokens in index.css.
 */
export const CHART = {
  users: '#0fb0fa',
  usersSoft: '#83d5fc',
  launches: '#34d399',
  /** User share of the selected window. */
  share: '#f59e0b',
  /** Launches per user. */
  perUser: '#a855f7',
  vip: '#f43f5e',
  grid: 'rgba(245, 246, 249, 0.06)',
  axis: '#707b8b',
  cursor: 'rgba(245, 246, 249, 0.05)',
} as const

/** Shared across every analytics chart and the map. */
export type ChartMetric = 'users' | 'launches'

export const CHART_METRICS = ['users', 'launches'] as const satisfies readonly ChartMetric[]

export function chartColor(metric: ChartMetric): string {
  return metric === 'users' ? CHART.users : CHART.launches
}

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

/**
 * Horizontal-bar charts (factions, servers, products, devices, versions)
 * share one label gutter and one row pitch so the coloured bars line up.
 */
export const CATEGORY_Y_WIDTH = 160
/** Narrower label gutter on phones so bars get more horizontal room. */
export const CATEGORY_Y_WIDTH_MOBILE = 70
export const CATEGORY_BAR_SIZE = 24
export const CATEGORY_ROW_HEIGHT = 48
export const CATEGORY_X_AXIS_HEIGHT = 36
export const CATEGORY_CHART_MARGIN = { top: 4, right: 12, bottom: 0, left: 8 } as const

/** Matches chartTooltipPosition — container below this uses compact category bars. */
export const NARROW_CHART_WIDTH = 520

export function categoryBarAxisLayout(containerWidth: number) {
  const compact = containerWidth > 0 && containerWidth < NARROW_CHART_WIDTH
  const yWidth = compact ? CATEGORY_Y_WIDTH_MOBILE : CATEGORY_Y_WIDTH
  const marginLeft = compact ? 4 : CATEGORY_CHART_MARGIN.left

  return {
    compact,
    yWidth,
    margin: { ...CATEGORY_CHART_MARGIN, left: marginLeft },
    plotLeft: yWidth + marginLeft,
    fontSize: compact ? 10 : AXIS_PROPS.fontSize,
  }
}

/** Shorten long Y labels on compact charts; full text stays in the tooltip. */
export function formatCategoryAxisLabel(label: string, compact: boolean): string {
  if (!compact) return label

  const max = 11
  if (label.length <= max) return label

  const server = /^\[(\d+)\]\s(.+)$/.exec(label)
  if (server?.[2]) {
    const prefix = `[${server[1]}] `
    const rest = server[2]
    const restMax = max - prefix.length
    if (restMax <= 1) return `${prefix}…`
    if (rest.length <= restMax) return label
    return `${prefix}${rest.slice(0, restMax - 1)}…`
  }

  return `${label.slice(0, max - 1)}…`
}

export function categoryChartHeight(rowCount: number) {
  return Math.max(rowCount, 1) * CATEGORY_ROW_HEIGHT + CATEGORY_X_AXIS_HEIGHT
}

/** Shared hover outline for chart bars and map countries. */
export const HOVER_OUTLINE = {
  stroke: 'rgba(245, 246, 249, 0.55)',
  strokeWidth: 1.5,
} as const

/** Hover outline on the bar itself — not the full-row tooltip band. */
export function barActiveProps(fill: string) {
  return {
    fill,
    ...HOVER_OUTLINE,
  } as const
}
