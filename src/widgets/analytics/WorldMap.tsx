import countries from 'i18n-iso-countries'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { CountryStats, PeriodKey } from '@/shared/api/usage'
import { useFormatters } from '@/shared/lib/format'
import { Card } from '@/shared/ui'

import { type ChartMetric, chartColor, HOVER_OUTLINE } from './chartTheme'
import { clampTooltipAnchorX } from './chartTooltipPosition'
import { ChartTooltip } from './ChartTooltip'
import { statsTooltipRows } from './statsTooltip'
import { CRIMEA_OVERLAY_PATHS, UKRAINE_NUMERIC_ID } from './crimeaOverlay'
import { COUNTRY_SHAPES, MAP_HEIGHT, MAP_WIDTH } from './worldGeometry'

const BASE_FILL = '#2a313c'
const STROKE = 'rgba(245, 246, 249, 0.08)'
/** Ignore synthetic mouse events that follow a touch on the same tap. */
const TOUCH_MOUSE_GUARD_MS = 700

interface WorldMapProps {
  countries: CountryStats[]
  period: PeriodKey
  metric: ChartMetric
}

interface HoverState {
  code: string
  x: number
  y: number
}

/**
 * Traffic is extremely concentrated: the top country has thousands of users
 * while the tail has one or two. On a linear ramp everything but Russia would
 * render as the empty colour, so intensity is compressed logarithmically.
 */
function intensityOf(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0
  return Math.log1p(value) / Math.log1p(max)
}

function fillFor(intensity: number, accent: string): string {
  if (intensity <= 0) return BASE_FILL
  return `color-mix(in oklab, ${accent} ${12 + intensity * 88}%, ${BASE_FILL})`
}

function pointerPosition(event: PointerEvent<SVGPathElement>, box: DOMRect) {
  return { x: event.clientX - box.left, y: event.clientY - box.top }
}

export function WorldMap({ countries: rows, period, metric }: WorldMapProps) {
  const { t, i18n } = useTranslation('helper')
  const format = useFormatters()
  const [hover, setHover] = useState<HoverState | null>(null)
  const mapFrameRef = useRef<HTMLDivElement>(null)
  const ignoreMouseUntilRef = useRef(0)
  const [mapWidth, setMapWidth] = useState(0)
  const accent = chartColor(metric)

  useLayoutEffect(() => {
    const node = mapFrameRef.current
    if (!node) return

    const update = () => setMapWidth(node.clientWidth)
    update()

    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const dismissOnOutsideTouch = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== 'touch') return
      if (mapFrameRef.current?.contains(event.target as Node)) return
      setHover(null)
    }

    document.addEventListener('pointerdown', dismissOnOutsideTouch)
    return () => document.removeEventListener('pointerdown', dismissOnOutsideTouch)
  }, [])

  const showHover = (event: PointerEvent<SVGPathElement>, row: CountryStats) => {
    if (event.pointerType === 'mouse' && Date.now() < ignoreMouseUntilRef.current) return

    const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!box) return
    setHover({ code: row.code, ...pointerPosition(event, box) })
  }

  const pinCountry = (event: PointerEvent<SVGPathElement>, row: CountryStats) => {
    if (event.pointerType !== 'touch') return
    event.preventDefault()
    ignoreMouseUntilRef.current = Date.now() + TOUCH_MOUSE_GUARD_MS
    showHover(event, row)
  }

  const displayNames = useMemo(
    () => new Intl.DisplayNames([i18n.language], { type: 'region' }),
    [i18n.language],
  )

  const { byNumericId, byCode, max } = useMemo(() => {
    const numeric = new Map<string, CountryStats>()
    const code = new Map<string, CountryStats>()
    let peak = 0

    for (const row of rows) {
      if (row.code === 'UNKNOWN') continue

      code.set(row.code, row)
      peak = Math.max(peak, row[metric][period])

      // world-atlas identifies features by ISO 3166-1 numeric, while the
      // payload uses alpha-2, so the two need bridging.
      const id = countries.alpha2ToNumeric(row.code)
      if (id) numeric.set(id, row)
    }

    return { byNumericId: numeric, byCode: code, max: peak }
  }, [rows, period, metric])

  const hovered = hover ? byCode.get(hover.code) : null
  const hasData = max > 0

  return (
    <Card className="p-4 text-left sm:p-6">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{t('analytics.map.title')}</h3>
        <p className="mt-1 text-sm text-fg-muted">{t('analytics.map.subtitle')}</p>
      </div>

      {!hasData ? (
        <p className="mt-8 text-sm text-fg-subtle">{t('analytics.empty')}</p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2 text-xs text-fg-subtle">
            <span>{t('analytics.map.less')}</span>
            <span
              aria-hidden
              className="h-2 w-24 rounded-full"
              style={{
                background: `linear-gradient(to right, ${fillFor(0.08, accent)}, ${fillFor(1, accent)})`,
              }}
            />
            <span>{t('analytics.map.more')}</span>
          </div>

          <div ref={mapFrameRef} className="relative mt-6">
            <svg
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              className="w-full touch-none"
              role="img"
              aria-label={t('analytics.map.title')}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') setHover(null)
              }}
              onPointerDown={(event) => {
                if (event.pointerType !== 'touch') return
                if (event.target === event.currentTarget) setHover(null)
              }}
            >
              {COUNTRY_SHAPES.map((shape) => {
                const row = byNumericId.get(shape.numericId)
                const value = row?.[metric][period] ?? 0
                const isHovered = row != null && hover?.code === row.code

                return (
                  <path
                    key={shape.numericId}
                    d={shape.path}
                    fill={fillFor(intensityOf(value, max), accent)}
                    stroke={isHovered ? HOVER_OUTLINE.stroke : STROKE}
                    strokeWidth={isHovered ? HOVER_OUTLINE.strokeWidth : 0.5}
                    className={row ? 'cursor-pointer' : undefined}
                    onPointerMove={(event) => {
                      if (!row || event.pointerType !== 'mouse') return
                      showHover(event, row)
                    }}
                    onPointerDown={(event) => {
                      if (!row) return
                      pinCountry(event, row)
                    }}
                  />
                )
              })}

              {(() => {
                const ukraine = byNumericId.get(UKRAINE_NUMERIC_ID)
                if (!ukraine) return null

                const value = ukraine[metric][period]
                const isHovered = hover?.code === ukraine.code

                return CRIMEA_OVERLAY_PATHS.map((path, index) => (
                  <path
                    key={`crimea-${index}`}
                    d={path}
                    fill={fillFor(intensityOf(value, max), accent)}
                    stroke={isHovered ? HOVER_OUTLINE.stroke : STROKE}
                    strokeWidth={isHovered ? HOVER_OUTLINE.strokeWidth : 0.5}
                    className="cursor-pointer"
                    onPointerMove={(event) => {
                      if (event.pointerType !== 'mouse') return
                      showHover(event, ukraine)
                    }}
                    onPointerDown={(event) => pinCountry(event, ukraine)}
                  />
                ))
              })()}
            </svg>

            {hover && hovered ? (
              <div
                className="pointer-events-none absolute z-10 max-w-[calc(100%-1rem)] -translate-x-1/2 -translate-y-[calc(100%+12px)]"
                style={{
                  left: clampTooltipAnchorX(hover.x, mapWidth || mapFrameRef.current?.clientWidth || 0),
                  top: hover.y,
                }}
              >
                <ChartTooltip
                  title={displayNames.of(hovered.code) ?? hovered.code}
                  rows={statsTooltipRows(t, format, {
                    users: hovered.users[period],
                    launches: hovered.launches[period],
                    vip_users: hovered.vip_users[period],
                    user_share: hovered.user_share[period],
                    launches_per_user: hovered.launches_per_user[period],
                    vip_percent: hovered.vip_percent[period],
                  })}
                />
              </div>
            ) : null}
          </div>
        </>
      )}
    </Card>
  )
}
