import { Crown, Download } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useRelease } from '@/features/release/useRelease'
import { usePublicStats } from '@/features/usage/usePublicStats'
import { buttonStyles, Card, DeferredMount, Skeleton } from '@/shared/ui'
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
      <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-fg-muted">
        {t('hero.subtitle')}
      </p>

      <div className="mx-auto mt-6 max-w-3xl text-left">
        <MediaGallery compact />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
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

function Changelog() {
  const { t } = useTranslation('helper')
  const { data, isPending, isError } = useRelease()

  if (isPending) {
    return <Skeleton className="h-20" label={t('release.loading')} />
  }

  if (isError || !data?.free.notes) return null

  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-fg-muted">{t('release.changelog')}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg-subtle">
        {data.free.notes}
      </p>
    </Card>
  )
}

function VipTeaser() {
  const { t } = useTranslation('helper')

  return (
    <Card className="glow-accent overflow-hidden p-8 text-center">
      <span className="grid mx-auto size-12 place-items-center rounded-2xl bg-accent-500/10 text-accent-300">
        <Crown aria-hidden className="size-6" />
      </span>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight">{t('vipTeaser.title')}</h2>
      <p className="mx-auto mt-3 max-w-xl text-fg-muted">{t('vipTeaser.subtitle')}</p>
      <Link to="/vip" className={buttonStyles({ className: 'mt-7' })}>
        {t('vipTeaser.action')}
      </Link>
    </Card>
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
    <div className="shell space-y-10 py-10">
      <Hero />
      {isError ? null : <QuickStats />}
      <Changelog />
      {isError ? null : (
        <DeferredMount fallback={<Skeleton className="h-96" />}>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <AnalyticsSection />
          </Suspense>
        </DeferredMount>
      )}
      <VipTeaser />
    </div>
  )
}
