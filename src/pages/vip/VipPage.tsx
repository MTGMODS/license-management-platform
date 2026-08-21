import { CreditCard, Infinity, MessageSquareText, Sparkles, Users } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useSalesStats } from '@/features/license/useSalesStats'
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
      <header className="@container space-y-1.5 text-center">
        <h1 className="text-gradient mx-auto max-w-full whitespace-nowrap text-[length:min(2.25rem,calc(100cqi/18))] font-semibold tracking-tight">
          {t('hero.title')}
        </h1>
        <p className="mx-auto max-w-full whitespace-nowrap text-[length:min(1.05rem,calc(100cqi/28))] leading-none text-fg-muted">
          {t('hero.subtitle')}
        </p>
        <p className="mx-auto max-w-full whitespace-nowrap text-[length:min(0.875rem,calc(100cqi/36))] leading-none text-fg-subtle">
          {t('hero.currency')}
        </p>
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
