import { createElement, useMemo, useSyncExternalStore } from 'react'
import type { YAxisTickContentProps } from 'recharts'

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

const LG_QUERY = '(min-width: 1024px)'

function subscribeLg(onStoreChange: () => void) {
  const mq = window.matchMedia(LG_QUERY)
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

/** Same breakpoint as the helper hero: PC keeps the default right-aligned ticks. */
function useDesktopChart() {
  return useSyncExternalStore(
    subscribeLg,
    () => window.matchMedia(LG_QUERY).matches,
    () => true,
  )
}

/**
 * Category ticks default to end-anchor at the inner edge, so on a phone the
 * names sit around the middle of the label column. Start them at ~0.5/2 of
 * that column instead, without shrinking the axis (that clipped "Полиция").
 */
function mobileCategoryTick(axisWidth: number) {
  return function MobileCategoryTick({ x, y, payload }: YAxisTickContentProps) {
    const tickX = Number(x)
    const tickY = Number(y)
    return createElement(
      'text',
      {
        x: tickX - axisWidth * 0.75 + 8,
        y: tickY,
        textAnchor: 'start',
        dominantBaseline: 'central',
        fill: CHART.axis,
        fontSize: AXIS_PROPS.fontSize,
      },
      payload.value,
    )
  }
}

export function useCategoryYAxis(width: number) {
  const isDesktop = useDesktopChart()
  const tick = useMemo(
    () => (isDesktop ? true : mobileCategoryTick(width)),
    [isDesktop, width],
  )
  return { ...AXIS_PROPS, width, tick }
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
