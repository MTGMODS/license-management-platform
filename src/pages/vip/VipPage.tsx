import { CreditCard, Infinity, MessageSquareText, Sparkles, Users } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react'
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
    <Card className="w-full shrink-0 p-[clamp(0.65rem,1.4vh,1rem)] text-left">
      <ul className="space-y-[clamp(0.45rem,1.1vh,0.75rem)]">
        {BENEFITS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.titleKey} className="flex gap-[clamp(0.5rem,1vh,0.75rem)]">
              <span className="mt-0.5 grid size-[clamp(1.75rem,3.6vh,2.25rem)] shrink-0 place-items-center rounded-lg bg-accent-500/10 text-accent-300">
                <Icon aria-hidden className="size-[clamp(0.85rem,1.8vh,1rem)]" />
              </span>
              <div className="min-w-0">
                <p className="text-[clamp(0.8rem,1.45vh,0.95rem)] font-medium text-fg">{t(item.titleKey)}</p>
                <p className="mt-0.5 text-[clamp(0.7rem,1.3vh,0.85rem)] leading-snug text-fg-muted">
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

function Hero() {
  const { t } = useTranslation('vip')

  return (
    <section className="flex min-h-0 flex-1 basis-0 flex-col text-center">
      <h1 className="text-gradient shrink-0 text-[clamp(1.35rem,min(3.8vh,4.8vw),2.75rem)] font-semibold tracking-tight">
        {t('hero.title')}
      </h1>
      <p className="mx-auto mt-[clamp(0.3rem,0.9vh,0.6rem)] max-w-2xl shrink-0 text-[clamp(0.8rem,1.45vh,1.05rem)] leading-relaxed text-fg-muted">
        {t('hero.subtitle')}
      </p>
      <p className="mx-auto mt-[clamp(0.15rem,0.5vh,0.35rem)] max-w-2xl shrink-0 text-[clamp(0.7rem,1.25vh,0.85rem)] text-fg-subtle">
        {t('hero.currency')}
      </p>

      <div className="mx-auto mt-[clamp(0.5rem,1.3vh,0.95rem)] flex min-h-0 w-full min-w-0 flex-1 basis-0 flex-col justify-center">
        <PricingGrid />
      </div>

      <div className="mt-[clamp(0.5rem,1.3vh,0.95rem)] shrink-0">
        <VipBenefits />
      </div>

      <div className="mt-[clamp(0.5rem,1.3vh,0.95rem)] flex shrink-0 justify-center">
        <Button size="lg" onClick={scrollToPayment}>
          <CreditCard aria-hidden className="size-4" />
          {t('hero.pay')}
        </Button>
      </div>
    </section>
  )
}

function PaymentStub() {
  const { t } = useTranslation('vip')

  return (
    <section id={PAYMENT_SECTION_ID} className="scroll-mt-24 pt-8">
      <Card className="flex min-h-64 flex-col items-center justify-center border-dashed p-8 text-center">
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
    <div className="shell flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'flex min-h-0 flex-col overflow-hidden py-[clamp(0.75rem,1.8vh,1.5rem)]',
          isError ? 'h-full flex-1' : 'h-[calc(100dvh-4rem)]',
        )}
      >
        <Hero />
        {isError ? null : (
          <div className="mt-[clamp(0.85rem,2.2vh,1.75rem)] hidden shrink-0 border-t border-white/5 pt-[clamp(0.75rem,1.8vh,1.25rem)] lg:block">
            <SalesOverview />
          </div>
        )}
      </div>
      <div className="pb-10">
        {isError ? null : (
          <div className="border-t border-white/5 pt-4 lg:hidden">
            <SalesOverview />
          </div>
        )}
        <PaymentStub />
        {isError ? null : (
          <DeferredMount fallback={<Skeleton className="mt-8 h-96" />}>
            <Suspense fallback={<Skeleton className="mt-8 h-96" />}>
              <SalesStats />
            </Suspense>
          </DeferredMount>
        )}
      </div>
    </div>
  )
}
