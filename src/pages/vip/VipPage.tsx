import { CreditCard, Infinity, MessageSquareText, Sparkles, Users } from 'lucide-react'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useSalesStats } from '@/features/license/useSalesStats'
import { cn } from '@/shared/lib/cn'
import { Button, Card, DeferredMount, Skeleton } from '@/shared/ui'
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

function VipBenefits() {
  const { t } = useTranslation('vip')

  return (
    <Card className="@container w-full p-4 text-left sm:p-5">
      <ul className="grid grid-cols-1 gap-4 @min-[36rem]:grid-cols-2 @min-[36rem]:gap-x-6 @min-[36rem]:gap-y-4">
        {BENEFITS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.titleKey} className="flex gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-500/10 text-accent-300">
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg sm:text-[0.95rem]">{t(item.titleKey)}</p>
                <p className="mt-0.5 text-xs leading-snug text-fg-muted sm:text-sm">
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

function PaymentStub() {
  const { t } = useTranslation('vip')

  return (
    <section id={PAYMENT_SECTION_ID} className="scroll-mt-24">
      <Card className="flex min-h-48 flex-col items-center justify-center border-dashed p-8 text-center sm:min-h-56">
        <h2 className="text-2xl font-semibold tracking-tight">{t('payment.title')}</h2>
        <p className="mt-2 max-w-md text-fg-muted">{t('payment.placeholder')}</p>
      </Card>
    </section>
  )
}

export function VipPage() {
  const { t } = useTranslation('vip')
  const { isError } = useSalesStats()
  const toasted = useRef(false)

  useEffect(() => {
    if (!isError) {
      toasted.current = false
      return
    }
    if (toasted.current) return
    toasted.current = true
    toast(t('stats.error'), { icon: null })
  }, [isError, t])

  return (
    <div className="shell space-y-8 py-8 sm:space-y-10 sm:py-10">
      <header className="w-full min-w-0 space-y-1.5 overflow-x-clip text-center">
        <FitLine as="h1" maxRem={2.25} className="text-gradient font-semibold tracking-tight">
          {t('hero.title')}
        </FitLine>
        <FitLine maxRem={1.35} className="leading-tight text-fg-muted">
          {t('hero.subtitle')}
        </FitLine>
        <FitLine maxRem={0.875} className="leading-tight text-fg-subtle">
          {t('hero.currency')}
        </FitLine>
      </header>

      <PricingGrid />
      <VipBenefits />

      <div className="flex justify-center">
        <Button size="lg" onClick={scrollToPayment}>
          <CreditCard aria-hidden className="size-4" />
          {t('hero.pay')}
        </Button>
      </div>

      {isError ? null : (
        <div className="border-t border-white/5 pt-8">
          <SalesOverview />
        </div>
      )}

      <PaymentStub />

      {isError ? null : (
        <DeferredMount fallback={<Skeleton className="h-96" />}>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <SalesStats />
          </Suspense>
        </DeferredMount>
      )}
    </div>
  )
}
