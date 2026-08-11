import countries from 'i18n-iso-countries'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CountryStats, PeriodKey } from '@/shared/api/usage'
import { useFormatters } from '@/shared/lib/format'
import { Card } from '@/shared/ui'

import { COUNTRY_SHAPES, MAP_HEIGHT, MAP_WIDTH } from './worldGeometry'

const BASE_FILL = '#1a1a25'
const STROKE = 'rgba(244, 245, 248, 0.08)'

interface WorldMapProps {
  countries: CountryStats[]
  period: PeriodKey
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

function fillFor(intensity: number): string {
  if (intensity <= 0) return BASE_FILL
  return `color-mix(in oklab, #7c5cff ${12 + intensity * 88}%, ${BASE_FILL})`
}

export function WorldMap({ countries: rows, period }: WorldMapProps) {
  const { t, i18n } = useTranslation('helper')
  const format = useFormatters()
  const [hover, setHover] = useState<HoverState | null>(null)

  const displayNames = useMemo(
    () => new Intl.DisplayNames([i18n.language], { type: 'region' }),
    [i18n.language],
  )

  const { byNumericId, byCode, max, unknownUsers } = useMemo(() => {
    const numeric = new Map<string, CountryStats>()
    const code = new Map<string, CountryStats>()
    let peak = 0
    let unknown = 0

    for (const row of rows) {
      if (row.code === 'UNKNOWN') {
        unknown = row.users[period]
        continue
      }

      code.set(row.code, row)
      peak = Math.max(peak, row.users[period])

      // world-atlas identifies features by ISO 3166-1 numeric, while the
      // payload uses alpha-2, so the two need bridging.
      const id = countries.alpha2ToNumeric(row.code)
      if (id) numeric.set(id, row)
    }

    return { byNumericId: numeric, byCode: code, max: peak, unknownUsers: unknown }
  }, [rows, period])

  const hovered = hover ? byCode.get(hover.code) : null

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{t('analytics.map.title')}</h3>
          <p className="mt-1 text-sm text-fg-muted">{t('analytics.map.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-fg-subtle">
          <span>{t('analytics.map.less')}</span>
          <span
            aria-hidden
            className="h-2 w-24 rounded-full"
            style={{ background: `linear-gradient(to right, ${fillFor(0.08)}, ${fillFor(1)})` }}
          />
          <span>{t('analytics.map.more')}</span>
        </div>
      </div>

      <div className="relative mt-6">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={t('analytics.map.title')}
          onMouseLeave={() => setHover(null)}
        >
          {COUNTRY_SHAPES.map((shape) => {
            const row = byNumericId.get(shape.numericId)
            const value = row?.users[period] ?? 0

            return (
              <path
                key={shape.numericId}
                d={shape.path}
                fill={fillFor(intensityOf(value, max))}
                stroke={STROKE}
                strokeWidth={0.5}
                className={row ? 'cursor-pointer' : undefined}
                onMouseMove={(event) => {
                  if (!row) return
                  const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
                  if (!box) return
                  setHover({
                    code: row.code,
                    x: event.clientX - box.left,
                    y: event.clientY - box.top,
                  })
                }}
              />
            )
          })}
        </svg>

        {hover && hovered ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)]"
            style={{ left: hover.x, top: hover.y }}
          >
            <div className="glass bevel rounded-xl px-3.5 py-2.5 text-sm shadow-xl">
              <p className="font-medium text-fg">
                {displayNames.of(hovered.code) ?? hovered.code}
              </p>
              <div className="mt-1.5 space-y-1 whitespace-nowrap">
                <div className="flex items-center gap-4 text-fg-muted">
                  <span>{t('analytics.metric.users')}</span>
                  <span className="tabular ml-auto font-medium text-fg">
                    {format.number(hovered.users[period])}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-fg-muted">
                  {/* The payload exposes launches as a single all-time number
                      for countries, unlike servers, so it cannot follow the
                      period selector and is labelled accordingly. */}
                  <span>{t('analytics.map.launchesAllTime')}</span>
                  <span className="tabular ml-auto font-medium text-fg">
                    {format.number(hovered.launches)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-fg-muted">
                  <span>{t('analytics.map.share')}</span>
                  <span className="tabular ml-auto font-medium text-fg">
                    {format.percent(hovered.user_share)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {unknownUsers > 0 ? (
        <p className="mt-3 text-sm text-fg-subtle">
          {t('analytics.map.unknownCountry', { count: unknownUsers })}
        </p>
      ) : null}
    </Card>
  )
}
