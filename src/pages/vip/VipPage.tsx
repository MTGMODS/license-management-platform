import { CreditCard, Infinity, MessageSquareText, Sparkles, Users } from 'lucide-react'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useLocalUsdPrice } from '@/features/geo/useLocalUsdPrice'
import { useSalesStats } from '@/features/license/useSalesStats'
import { useTariffs } from '@/features/license/useTariffs'
import { cn } from '@/shared/lib/cn'
import { Button, Card, DeferredMount, Skeleton } from '@/shared/ui'
import { PaymentSection } from '@/widgets/vip/PaymentSection'
import { PricingGrid } from '@/widgets/vip/PricingGrid'
import { SalesOverview } from '@/widgets/vip/SalesOverview'

const PAYMENT_SECTION_ID = 'vip-payment'

const BENEFITS = [
  { icon: Sparkles, titleKey: 'benefits.goldTitle', textKey: 'benefits.gold', withGuide: true },
  { icon: Infinity, titleKey: 'benefits.limitsTitle', textKey: 'benefits.limits' },
  { icon: MessageSquareText, titleKey: 'benefits.chatTitle', textKey: 'benefits.chat' },
  { icon: Users, titleKey: 'benefits.communityTitle', textKey: 'benefits.community' },
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

/** Four stacked rows — content-sized, never stretched. */
function VipBenefits() {
  const { t } = useTranslation('vip')

  return (
    <Card className="w-full shrink-0 p-4 text-left sm:p-5 lg:p-[clamp(0.45rem,1vh,0.85rem)]">
      <ul className="grid grid-cols-1 gap-3 sm:gap-3.5 lg:gap-[clamp(0.25rem,0.75vh,0.55rem)]">
        {BENEFITS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.titleKey} className="flex gap-2.5 sm:gap-3 lg:gap-2.5">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-accent-500/10 text-accent-300 sm:size-8 lg:size-[clamp(1.6rem,2.8vh,2rem)]">
                <Icon aria-hidden className="size-3.5 sm:size-4 lg:size-[clamp(0.8rem,1.4vh,1rem)]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg sm:text-[0.95rem] lg:text-[clamp(0.8rem,1.45vh,0.95rem)]">
                  {t(item.titleKey)}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-fg-muted sm:text-sm lg:text-[clamp(0.7rem,1.25vh,0.85rem)] lg:leading-snug">
                  {'withGuide' in item && item.withGuide ? (
                    <Trans
                      i18nKey={item.textKey}
                      ns="vip"
                      components={{ gallery: <GalleryLink /> }}
                    />
                  ) : (
                    t(item.textKey)
                  )}
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
  const tariffsReady = !tariffsPending && !tariffsError && Boolean(tariffs?.plans.length)
  const foldOk = tariffsReady && !statsError

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
      {/* Desktop fold: spare height between subtitle and tariffs. Mobile: normal scroll. */}
      <div
        className={cn(
          'flex flex-col py-6 sm:py-8',
          tariffsError || !tariffsReady
            ? 'flex-1'
            : 'lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:py-[clamp(0.4rem,1.1vh,0.9rem)]',
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
            {/* Desktop: spare height between subtitle and tariffs; can collapse to 0. */}
            <div className="hidden min-h-0 flex-1 lg:block" aria-hidden />

            <div className="mt-6 flex shrink-0 flex-col gap-5 lg:mt-0 lg:gap-[clamp(0.35rem,1vh,0.7rem)] lg:pt-[clamp(0.35rem,1.2vh,0.85rem)]">
              <div className="lg:hidden">
                <PricingGrid />
              </div>
              <div className="hidden lg:block">
                <PricingGrid compact />
              </div>

              {tariffsReady ? (
                <>
                  <VipBenefits />
                  <div className="flex justify-center">
                    <Button size="lg" onClick={scrollToPayment}>
                      <CreditCard aria-hidden className="size-4" />
                      {t('hero.pay')}
                    </Button>
                  </div>
                </>
              ) : null}

              {foldOk ? (
                <div className="hidden shrink-0 border-t border-white/5 pt-[clamp(0.35rem,1vh,0.7rem)] lg:block">
                  <SalesOverview compact />
                </div>
              ) : null}
            </div>
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
          <div className="border-t border-white/8 pt-8 sm:pt-10">
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
