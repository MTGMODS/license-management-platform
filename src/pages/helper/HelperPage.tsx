import { Download } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useRelease } from '@/features/release/useRelease'
import { usePublicStats } from '@/features/usage/usePublicStats'
import { cn } from '@/shared/lib/cn'
import { buttonStyles, DeferredMount, Skeleton } from '@/shared/ui'
import { MediaGallery } from '@/widgets/gallery/MediaGallery'
import { QuickStats } from '@/widgets/stats/QuickStats'

/**
 * The charting library and the world atlas together outweigh the rest of the
 * app, and this section sits below the fold, so it is fetched only once the
 * page itself is interactive.
 */
const AnalyticsSection = lazy(() =>
  import('@/widgets/analytics/AnalyticsSection').then((module) => ({
    default: module.AnalyticsSection,
  })),
)

function Hero() {
  const { t } = useTranslation('helper')
  const { data } = useRelease()
  const version = data?.free.rawVersion
  const downloadLabel = version
    ? t('hero.downloadVersion', { version })
    : t('hero.download')

  return (
    <section className="flex min-h-0 flex-1 basis-0 flex-col text-center">
      <h1 className="text-gradient shrink-0 text-[clamp(1.75rem,4.2vh,3.25rem)] font-semibold tracking-tight">
        {t('hero.title')}
      </h1>
      <p className="mx-auto mt-[clamp(0.35rem,1vh,0.75rem)] max-w-2xl shrink-0 text-[clamp(0.875rem,1.6vh,1.125rem)] leading-relaxed text-fg-muted">
        {t('hero.subtitle')}
      </p>

      <div className="mx-auto mt-[clamp(0.5rem,1.4vh,1rem)] flex min-h-0 w-full min-w-0 flex-1 basis-0 flex-col">
        <MediaGallery compact />
      </div>

      <div className="mt-[clamp(0.5rem,1.4vh,1rem)] flex shrink-0 flex-wrap justify-center gap-3">
        <Link to="/helper/download" className={buttonStyles({ size: 'lg' })}>
          <Download aria-hidden className="size-4" />
          {downloadLabel}
        </Link>
        <Link to="/vip" className={buttonStyles({ size: 'lg', variant: 'secondary' })}>
          {t('hero.vip')}
        </Link>
      </div>
    </section>
  )
}

export function HelperPage() {
  const { t } = useTranslation('helper')
  const { isError } = usePublicStats()
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
          <div className="mt-[clamp(0.75rem,2vh,1.5rem)] hidden shrink-0 lg:block">
            <QuickStats />
          </div>
        )}
      </div>
      {isError ? null : (
        <div className="pb-10">
          <div className="lg:hidden pt-2">
            <QuickStats />
          </div>
          <DeferredMount fallback={<Skeleton className="mt-8 h-96" />}>
            <Suspense fallback={<Skeleton className="mt-8 h-96" />}>
              <AnalyticsSection />
            </Suspense>
          </DeferredMount>
        </div>
      )}
    </div>
  )
}
