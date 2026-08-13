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
  const version = data?.free.version
  const downloadLabel = version
    ? t('hero.downloadVersion', { version })
    : t('hero.download')

  return (
    <section className="text-center">
      <h1 className="text-gradient text-4xl font-semibold tracking-tight sm:text-5xl">
        {t('hero.title')}
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
        {t('hero.subtitle')}
      </p>

      <div className="mx-auto mt-5 max-w-lg">
        <MediaGallery compact />
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
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
    toast.error(t('stats.error'))
  }, [isError, t])

  return (
    <div
      className={cn(
        'shell flex flex-1 flex-col py-6',
        isError ? 'justify-center' : 'space-y-8',
      )}
    >
      <Hero />
      {isError ? null : <QuickStats />}
      {isError ? null : (
        <DeferredMount fallback={<Skeleton className="h-96" />}>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <AnalyticsSection />
          </Suspense>
        </DeferredMount>
      )}
    </div>
  )
}
