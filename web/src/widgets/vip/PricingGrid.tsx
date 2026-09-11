import { MonitorSmartphone, Unlink } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useLocalUsdPrice } from '@/features/geo/useLocalUsdPrice'
import { useTariffs } from '@/features/license/useTariffs'
import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'
import type { LocalApproxDisplay } from '@/shared/lib/localCurrency'
import { Card, Skeleton } from '@/shared/ui'

const SHORT_DESKTOP = '[@media(min-width:1024px)_and_(max-height:48rem)]'

function catalogPrice(price: number, format: ReturnType<typeof useFormatters>): string {
  return Number.isInteger(price) ? String(price) : format.money(price)
}

function priceTypeClass(compact: boolean): string {
  return compact
    ? cn('text-[clamp(1.25rem,2.8vh,1.875rem)]', `${SHORT_DESKTOP}:text-xl`)
    : 'text-2xl sm:text-3xl'
}

type PriceFit = 'spaced' | 'tight' | 'stacked'

function PlanPrice({
  usd,
  local,
  compact,
}: {
  usd: string
  local: LocalApproxDisplay | null
  compact: boolean
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<PriceFit>('spaced')
  const usdClass = cn('tabular font-semibold tracking-tight', priceTypeClass(compact))
  const stackedLocalClass = cn(
    'tabular font-semibold tracking-tight text-fg-muted',
    compact
      ? cn('text-[clamp(1rem,2.2vh,1.35rem)]', `${SHORT_DESKTOP}:text-lg`)
      : 'text-xl sm:text-2xl',
  )
  const spacedGapPx = compact ? 6 : 8

  useLayoutEffect(() => {
    const box = boxRef.current
    const measureEl = measureRef.current
    if (!box || !measureEl || !local) {
      setFit('spaced')
      return
    }

    const measure = () => {
      if (box.clientWidth < 8) return
      let content = 0
      for (const child of measureEl.children) {
        content += (child as HTMLElement).offsetWidth
      }
      const avail = box.clientWidth
      let next: PriceFit
      if (content + spacedGapPx * 2 <= avail + 1) next = 'spaced'
      else if (content <= avail + 1) next = 'tight'
      else next = 'stacked'
      setFit((prev) => (prev === next ? prev : next))
    }

    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    measure()
    const observer = new ResizeObserver(schedule)
    observer.observe(box)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [compact, local, spacedGapPx, usd])

  return (
    <div
      ref={boxRef}
      className={cn(
        'relative w-full min-w-0',
        compact ? cn('mt-[clamp(0.25rem,0.7vh,0.5rem)]', `${SHORT_DESKTOP}:mt-1`) : 'mt-1.5',
      )}
    >
      {local ? (
        <div
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute flex flex-nowrap items-baseline gap-0"
        >
          <span className={usdClass}>${usd}</span>
          <span className={usdClass}>≈</span>
          <span className={usdClass}>{local.text}</span>
        </div>
      ) : null}
      <div
        className={
          local && fit === 'stacked'
            ? 'flex flex-col items-start'
            : cn(
                'flex flex-nowrap items-baseline',
                fit === 'tight' ? 'gap-x-0' : compact ? 'gap-x-1.5' : 'gap-x-2',
              )
        }
      >
        <p className={usdClass}>${usd}</p>
        {local ? (
          fit === 'stacked' ? (
            <p className={stackedLocalClass}>
              <span className="text-fg-subtle">≈</span>
              {local.text}
            </p>
          ) : (
            <>
              <span className={cn(usdClass, 'text-fg-subtle')} aria-hidden>
                ≈
              </span>
              <p className={usdClass}>{local.text}</p>
            </>
          )
        ) : null}
      </div>
    </div>
  )
}

export function PricingGrid({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation('vip')
  const format = useFormatters()
  const { data, isPending, isError } = useTariffs()
  const { formatApprox } = useLocalUsdPrice()
  const gridClass = cn(
    'grid w-full grid-cols-2 items-stretch lg:grid-cols-4',
    compact
      ? cn('gap-[clamp(0.4rem,1vh,0.75rem)]', `${SHORT_DESKTOP}:gap-2`)
      : 'gap-3 lg:gap-4',
  )

  if (isPending) {
    return (
      <div className={gridClass}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            className={compact ? 'h-[clamp(7.5rem,18vh,11rem)]' : 'h-36'}
            label={index === 0 ? t('pricing.loading') : undefined}
          />
        ))}
      </div>
    )
  }

  if (isError || !data || data.plans.length === 0) {
    return null
  }

  return (
    <div className={gridClass}>
      {data.plans.map((plan) => {
        const resetValue = String(plan.reset_limit)
        const localApprox = formatApprox(plan.price)
        const daysLabel = t('pricing.days', { count: plan.duration_days })
        const perDayPrice = format.money(plan.price / plan.duration_days)
        const perDay = { price: perDayPrice }
        const metaText = compact
          ? cn(
              'text-[clamp(0.65rem,1.15vh,0.8rem)]',
              `${SHORT_DESKTOP}:text-[0.65rem]`,
            )
          : 'text-xs sm:text-sm'

        return (
          <Card
            key={plan.duration_days}
            className={cn(
              'flex flex-col border border-accent-500/40 text-left',
              compact
                ? cn('p-[clamp(0.55rem,1.1vh,0.85rem)]', `${SHORT_DESKTOP}:p-2.5`)
                : 'p-3.5 sm:p-4',
            )}
          >
            <p
              className={cn(
                'whitespace-nowrap tabular',
                compact
                  ? cn(
                      'text-[clamp(0.6rem,1.1vh,0.75rem)]',
                      `${SHORT_DESKTOP}:text-[0.65rem]`,
                    )
                  : 'text-[0.7rem] sm:text-sm',
              )}
            >
              <span className="font-semibold text-fg">{daysLabel}</span>
              <span className="text-fg-muted">
                <span className="sm:hidden">{t('pricing.daysWithPerDayTight', perDay)}</span>
                <span className="hidden sm:inline">{t('pricing.daysWithPerDay', perDay)}</span>
              </span>
            </p>

            <PlanPrice
              usd={catalogPrice(plan.price, format)}
              local={localApprox}
              compact={compact}
            />

            <div
              className={cn(
                'space-y-1 border-t border-white/8 text-fg-muted',
                compact
                  ? cn(
                      'mt-[clamp(0.4rem,1vh,0.7rem)] pt-[clamp(0.35rem,0.9vh,0.6rem)]',
                      `${SHORT_DESKTOP}:mt-2 ${SHORT_DESKTOP}:pt-1.5`,
                    )
                  : 'mt-3 pt-2.5',
                metaText,
              )}
            >
              <p className="flex items-center gap-1.5">
                <MonitorSmartphone aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />
                <span className="min-w-0 leading-snug">
                  {t('pricing.devicesLabel')}: <span className="tabular">{plan.max_devices}</span>
                </span>
              </p>
              <p className="flex items-center gap-1.5">
                <Unlink aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />
                <span className="min-w-0 leading-snug">
                  {t('pricing.hwidResetLabel')}: <span className="tabular">{resetValue}</span>
                </span>
              </p>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
