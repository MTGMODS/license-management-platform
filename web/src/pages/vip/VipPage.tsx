import { BanknoteX, CreditCard, Crown, Infinity as InfinityIcon, MessageSquareText, Sparkles, Users } from 'lucide-react'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useLocalUsdPrice } from '@/features/geo/useLocalUsdPrice'
import { useSalesStats } from '@/features/license/useSalesStats'
import { useTariffs } from '@/features/license/useTariffs'
import { cn } from '@/shared/lib/cn'
import { useFormatters } from '@/shared/lib/format'
import { Button, Card, DeferredMount, Skeleton, buttonStyles } from '@/shared/ui'
import { PaymentSection } from '@/widgets/vip/PaymentSection'
import { PricingGrid } from '@/widgets/vip/PricingGrid'
import { SalesOverview } from '@/widgets/vip/SalesOverview'

const PAYMENT_SECTION_ID = 'vip-payment'

const BENEFITS = [
  { icon: Sparkles, titleKey: 'benefits.goldTitle', textKey: 'benefits.gold', withGuide: true, tone: 'bg-amber-400/10 text-amber-300' },
  { icon: InfinityIcon, titleKey: 'benefits.limitsTitle', textKey: 'benefits.limits', tone: 'bg-teal-400/10 text-teal-300' },
  { icon: MessageSquareText, titleKey: 'benefits.chatTitle', textKey: 'benefits.chat', tone: 'bg-accent-500/10 text-accent-300' },
  { icon: Users, titleKey: 'benefits.communityTitle', textKey: 'benefits.community', tone: 'bg-violet-400/10 text-violet-300' },
] as const

/** Shares the charting chunk with the helper analytics; loaded on approach. */
const SalesStats = lazy(() =>
  import('@/widgets/vip/SalesStats').then((module) => ({ default: module.SalesStats })),
)

function scrollToPayment() {
  document.getElementById(PAYMENT_SECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Shrinks a single line to the parent width; CSS cqi/`nowrap` alone can overflow. */
function FitLine({
  as: Tag = 'p',
  className,
  maxRem,
  children,
}: {
  as?: 'h1' | 'p'
  className?: string
  maxRem: number
  children: ReactNode
}) {
  const ref = useRef<HTMLHeadingElement | HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return

    const fit = () => {
      el.style.fontSize = `${maxRem}rem`
      const available = parent.clientWidth
      const needed = el.scrollWidth
      if (needed > available && needed > 0) {
        el.style.fontSize = `${((maxRem * available) / needed) * 0.98}rem`
      }
    }

    fit()
    void document.fonts?.ready.then(fit)
    const observer = new ResizeObserver(fit)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [children, maxRem])

  return (
    <Tag ref={ref} className={cn('mx-auto block w-max whitespace-nowrap', className)}>
      {children}
    </Tag>
  )
}

function GalleryLink({ children }: { children?: ReactNode }) {
  return (
    <Link
      to="/helper"
      className="text-accent-300 underline decoration-accent-500/40 underline-offset-2 transition-colors hover:text-accent-200"
    >
      {children}
    </Link>
  )
}

/** Short desktop (e.g. 1280×720): tighter 2×2. Tall desktop: four rows. Phones unchanged. */
const SHORT_DESKTOP = '[@media(min-width:1024px)_and_(max-height:48rem)]'

/** The summary footer marks the bottom of the first desktop viewport. */
const DESKTOP_FOLD = cn(
  'lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-rows-[auto_minmax(0,1fr)_auto]',
  'lg:py-[clamp(0.75rem,1.5vh,1.25rem)]',
)

function VipBenefits() {
  const { t } = useTranslation('vip')

  return (
    <Card className="flex w-full shrink-0 flex-col border-amber-400/20 bg-gradient-to-br from-amber-400/[0.035] via-transparent to-transparent p-5 text-left sm:p-6">
    <h2 className="mb-5 flex shrink-0 items-center justify-center gap-2.5 text-center text-base font-semibold text-amber-200 sm:text-lg">
      <Crown aria-hidden className="size-5 shrink-0 text-amber-300" />
      {t('benefits.title')}
    </h2>
    <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {BENEFITS.map((item) => {
        const Icon = item.icon
        return (
          <li key={item.titleKey} className="flex min-w-0 items-center gap-4 py-2">
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', item.tone)}>
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-snug lg:text-[clamp(0.875rem,1.5vh,1rem)]">{t(item.titleKey)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted lg:text-[clamp(0.8125rem,1.35vh,0.875rem)]">
                  {'withGuide' in item && item.withGuide ? (
                    <Trans i18nKey={item.textKey} ns="vip" components={{ gallery: <GalleryLink /> }} />
                  ) : t(item.textKey)}
                </p>
              </div>
          </li>
        )
      })}
    </ul>
    </Card>
  )
}

export function VipPage() {
  const { t } = useTranslation(['vip', 'common'])
  const format = useFormatters()
  const [selectedDays, setSelectedDays] = useState(30)
  const { isError: statsError } = useSalesStats()
  const {
    data: tariffs,
    isPending: tariffsPending,
    isError: tariffsError,
    refetch: refetchTariffs,
    isFetching: tariffsFetching,
  } = useTariffs()
  const { ready: localFxReady } = useLocalUsdPrice()
  const toasted = useRef(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const tariffsReady = !tariffsPending && !tariffsError && Boolean(tariffs?.plans.length)
  const foldOk = tariffsReady && !statsError
  const selectedPlan = tariffs?.plans.find((plan) => Number(plan.duration_days) === selectedDays)
    ?? tariffs?.plans.find((plan) => Number(plan.duration_days) === 30)
    ?? tariffs?.plans[0]

  useLayoutEffect(() => {
    const frame = frameRef.current
    const content = contentRef.current
    if (!frame || !content) return

    let raf = 0
    let disposed = false
    const fit = () => {
      content.style.zoom = '1'
      content.style.minHeight = '0'
      content.style.gap = ''
      content.style.paddingTop = ''
      if (!window.matchMedia('(min-width: 1024px)').matches) return
      const available = frame.clientHeight
      const needed = content.getBoundingClientRect().height
      if (available > 0 && needed > 0) {
        // Spend spare height on separation between sections, not inside benefits.
        const currentGap = parseFloat(getComputedStyle(content).gap) || 0
        const gapCount = 2
        const extra = Math.max(0, available - needed)
        const gap = Math.min(64, currentGap + extra / 3)
        content.style.gap = `${gap}px`
        const height = content.getBoundingClientRect().height
        const scale = Math.min(1, available / height)
        content.style.zoom = String(scale)
        content.style.minHeight = `${available / scale}px`
        const remaining = Math.max(0, available / scale - height)
        content.style.paddingTop = `${remaining / (gapCount + 1)}px`
      }
    }
    const schedule = () => {
      if (disposed) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(fit)
    }
    fit()
    const observer = new ResizeObserver(schedule)
    observer.observe(frame)
    window.addEventListener('resize', schedule)
    void document.fonts?.ready.then(schedule)
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      content.style.zoom = '1'
      content.style.minHeight = '0'
      content.style.gap = ''
      content.style.paddingTop = ''
    }
  }, [tariffsReady, tariffs, localFxReady, selectedPlan, t])

  useEffect(() => {
    if (!statsError) {
      toasted.current = false
      return
    }
    if (toasted.current) return
    toasted.current = true
    toast(t('stats.error'), { icon: null })
  }, [statsError, t])

  return (
    <div className="shell flex min-h-0 flex-1 flex-col">
      {/* Desktop ends at the overview footer; payment starts below the fold. */}
      <div
        className={cn(
          'flex flex-col py-6 sm:py-8',
          tariffsError || !tariffsReady ? 'flex-1' : DESKTOP_FOLD,
        )}
      >
        <header className="w-full min-w-0 shrink-0 space-y-1.5 overflow-x-clip text-center lg:space-y-1">
          <FitLine as="h1" maxRem={2.25} className="text-gradient font-semibold tracking-tight">
            {t('hero.title')}
          </FitLine>
          <FitLine maxRem={1.25} className="leading-tight text-fg-muted">
            {t('hero.subtitle')}
          </FitLine>
          {localFxReady ? null : (
            <FitLine maxRem={0.875} className="leading-tight text-fg-subtle">
              {t('hero.currency')}
            </FitLine>
          )}
        </header>

        {tariffsError || (!tariffsPending && !tariffsReady) ? (
          <Card className="mt-8 px-6 py-10 text-center sm:px-10">
            <p className="text-lg font-semibold tracking-tight">{t('pricing.error')}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">{t('pricing.errorHint')}</p>
            <Button
              className="mt-6"
              variant="secondary"
              loading={tariffsFetching}
              onClick={() => void refetchTariffs()}
            >
              {t('common:actions.retry')}
            </Button>
          </Card>
        ) : (
          <>
            <div ref={frameRef} className="mt-8 min-h-0 lg:mt-[clamp(1.5rem,3vh,2.5rem)]">
              <div
                ref={contentRef}
                className={cn(
                  'flex shrink-0 flex-col gap-5',
                  'lg:gap-6',
                )}
              >
                <div className="lg:hidden">
                  <PricingGrid selectedDays={selectedPlan ? Number(selectedPlan.duration_days) : 30} onChoose={setSelectedDays} />
                </div>
                <div className="hidden lg:block">
                  <PricingGrid compact selectedDays={selectedPlan ? Number(selectedPlan.duration_days) : 30} onChoose={setSelectedDays} />
                </div>

                {tariffsReady ? (
                  <>
                    {selectedPlan ? (
                      <div className="flex shrink-0 flex-col items-center justify-center gap-3 lg:flex-row">
                        <Button size="lg" onClick={scrollToPayment}
                          className="max-w-full whitespace-normal text-center">
                          <CreditCard aria-hidden className="size-4 shrink-0" />
                          {t('hero.checkout', {
                            period: t('pricing.days', { count: selectedPlan.duration_days }),
                            price: Number.isInteger(selectedPlan.price) ? String(selectedPlan.price) : format.money(selectedPlan.price),
                          })}
                        </Button>
                        <Link to="/helper" className={buttonStyles({ size: 'lg', variant: 'secondary' })}>
                          <BanknoteX aria-hidden className="size-4" />
                          {t('hero.backToFree')}
                        </Link>
                      </div>
                    ) : null}
                    <VipBenefits />
                  </>
                ) : null}
              </div>
            </div>

            {foldOk ? (
              <div
                className={cn(
                  'mt-6 hidden shrink-0 border-t border-white/5 pt-6 lg:block',
                  'lg:mt-[clamp(0.75rem,1.5vh,1.25rem)]',
                  'lg:pt-[clamp(0.5rem,1vh,0.85rem)]',
                )}
              >
                <SalesOverview compact />
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="space-y-8 pb-10">
        {foldOk ? (
          <div className="border-t border-white/5 pt-6 lg:hidden">
            <SalesOverview />
          </div>
        ) : null}

        {tariffsReady ? (
          <div
            className={cn(
              'border-t border-white/8 pt-8 sm:pt-10',
              `${SHORT_DESKTOP}:pt-6`,
            )}
          >
            <PaymentSection />
          </div>
        ) : null}

        {statsError ? null : (
          <div className="border-t border-white/8 pt-8 sm:pt-10">
            <DeferredMount fallback={<Skeleton className="h-96" />}>
              <Suspense fallback={<Skeleton className="h-96" />}>
                <SalesStats />
              </Suspense>
            </DeferredMount>
          </div>
        )}
      </div>
    </div>
  )
}
