import { BanknoteX, CreditCard, Infinity, MessageSquareText, Sparkles, Users } from 'lucide-react'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useLocalUsdPrice } from '@/features/geo/useLocalUsdPrice'
import { useSalesStats } from '@/features/license/useSalesStats'
import { useTariffs } from '@/features/license/useTariffs'
import { cn } from '@/shared/lib/cn'
import { Button, Card, DeferredMount, Skeleton, buttonStyles } from '@/shared/ui'
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

/** Short desktop (e.g. 1280×720): tighter 2×2. Tall desktop: four rows. Phones unchanged. */
const SHORT_DESKTOP = '[@media(min-width:1024px)_and_(max-height:48rem)]'

/** Desktop fold: fixed viewport height, stats row always fully visible at the bottom. */
const DESKTOP_FOLD = cn(
  'lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-rows-[auto_minmax(0,1fr)_auto]',
  'lg:overflow-hidden lg:py-[clamp(0.4rem,1.1vh,0.9rem)]',
)

function VipBenefits() {
  const { t } = useTranslation('vip')

  return (
    <Card
      className={cn(
        'w-full shrink-0 p-4 text-left sm:p-5',
        'lg:p-[clamp(0.85rem,1.6vh,1.25rem)]',
        `${SHORT_DESKTOP}:p-3`,
      )}
    >
      <ul
        className={cn(
          'grid grid-cols-1 gap-3.5 sm:gap-4',
          'lg:gap-[clamp(0.65rem,1.35vh,1rem)]',
          `${SHORT_DESKTOP}:grid-cols-2`,
          `${SHORT_DESKTOP}:gap-x-4`,
          `${SHORT_DESKTOP}:gap-y-2`,
        )}
      >
        {BENEFITS.map((item) => {
          const Icon = item.icon
          return (
            <li
              key={item.titleKey}
              className={cn(
                'flex gap-3 sm:gap-3.5',
                'lg:gap-[clamp(0.75rem,1.4vh,1rem)]',
                `${SHORT_DESKTOP}:gap-2.5`,
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-300 sm:size-10',
                  'lg:size-[clamp(2.25rem,3.6vh,2.75rem)]',
                  `${SHORT_DESKTOP}:size-7`,
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    'size-4 sm:size-[1.15rem]',
                    'lg:size-[clamp(1.1rem,1.8vh,1.35rem)]',
                    `${SHORT_DESKTOP}:size-3.5`,
                  )}
                />
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-base font-medium leading-snug text-fg sm:text-[1.05rem]',
                    'lg:text-[clamp(1rem,1.75vh,1.15rem)]',
                    `${SHORT_DESKTOP}:text-sm`,
                  )}
                >
                  {t(item.titleKey)}
                </p>
                <p
                  className={cn(
                    'mt-1 text-sm leading-snug text-fg-muted sm:text-[0.95rem]',
                    'lg:mt-[clamp(0.2rem,0.5vh,0.35rem)] lg:text-[clamp(0.85rem,1.45vh,0.95rem)] lg:leading-snug',
                    `${SHORT_DESKTOP}:mt-0.5 ${SHORT_DESKTOP}:text-xs ${SHORT_DESKTOP}:leading-snug`,
                  )}
                >
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
      {/* Desktop fold: pack hero→CTA from the top; sales overview pins to the fold bottom. */}
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
            {/* Row 2: fixed hero→tariff gap, flex void, content + CTA pinned above stats. */}
            <div className="mt-6 flex min-h-0 flex-col lg:mt-0 lg:h-full lg:overflow-hidden">
              <div
                className="hidden shrink-0 lg:block lg:h-[clamp(0.75rem,2vh,1.25rem)]"
                aria-hidden
              />
              <div className="hidden min-h-0 flex-1 lg:block" aria-hidden />

              <div
                className={cn(
                  'flex shrink-0 flex-col gap-5',
                  'lg:gap-[clamp(0.45rem,1.15vh,0.85rem)]',
                  `${SHORT_DESKTOP}:gap-2`,
                )}
              >
                <div className="lg:hidden">
                  <PricingGrid />
                </div>
                <div className="hidden lg:block">
                  <PricingGrid compact />
                </div>

                {tariffsReady ? (
                  <>
                    <VipBenefits />
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        size="lg"
                        className={cn(
                          `${SHORT_DESKTOP}:h-10`,
                          `${SHORT_DESKTOP}:px-4`,
                          `${SHORT_DESKTOP}:text-sm`,
                        )}
                        onClick={scrollToPayment}
                      >
                        <CreditCard aria-hidden className="size-4" />
                        {t('hero.pay')}
                      </Button>
                      <Link
                        to="/helper"
                        className={buttonStyles({
                          size: 'lg',
                          variant: 'secondary',
                          className: cn(
                            `${SHORT_DESKTOP}:h-10`,
                            `${SHORT_DESKTOP}:px-4`,
                            `${SHORT_DESKTOP}:text-sm`,
                          ),
                        })}
                      >
                        <BanknoteX aria-hidden className="size-4" />
                        {t('hero.backToFree')}
                      </Link>
                    </div>
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
