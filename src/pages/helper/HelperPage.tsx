import { ArrowRight, Crown, Download, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useRelease } from '@/features/release/useRelease'
import { Badge, buttonStyles, Card, Skeleton } from '@/shared/ui'
import { MediaGallery } from '@/widgets/gallery/MediaGallery'
import { QuickStats } from '@/widgets/stats/QuickStats'

function Hero() {
  const { t } = useTranslation('helper')

  return (
    <section className="text-center">
      <Badge tone="accent">
        <Sparkles aria-hidden className="size-3.5" />
        {t('hero.eyebrow')}
      </Badge>

      <h1 className="text-gradient mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
        {t('hero.title')}
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-fg-muted">
        {t('hero.subtitle')}
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link to="/helper/download" className={buttonStyles({ size: 'lg' })}>
          <Download aria-hidden className="size-4" />
          {t('hero.download')}
        </Link>
        <Link to="/vip" className={buttonStyles({ size: 'lg', variant: 'secondary' })}>
          {t('hero.vip')}
        </Link>
      </div>
    </section>
  )
}

function ReleaseSection() {
  const { t } = useTranslation('helper')
  const { data, isPending, isError } = useRelease()

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">{t('release.title')}</h2>
      <p className="mt-2 text-fg-muted">{t('release.subtitle')}</p>

      <Card className="mt-6 p-6 sm:p-8">
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" label={t('release.loading')} />
            <Skeleton className="h-4 w-72" />
          </div>
        ) : isError || !data ? (
          <p className="text-sm text-fg-muted">{t('release.unavailable')}</p>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-fg-subtle">{t('release.version')}</span>
                <span className="tabular text-2xl font-semibold">{data.free.version}</span>
                {data.vip ? (
                  <Badge tone="neutral">
                    <Crown aria-hidden className="size-3.5" />
                    <span className="tabular">
                      {t('release.vipVersion')}: {data.vip.version}
                    </span>
                  </Badge>
                ) : null}
              </div>

              {data.free.notes ? (
                <div className="mt-5">
                  <p className="text-sm font-medium text-fg-muted">{t('release.changelog')}</p>
                  {/* Authored as plain text with newlines, so line breaks are preserved rather than parsed. */}
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg-subtle">
                    {data.free.notes}
                  </p>
                </div>
              ) : null}
            </div>

            <Link to="/helper/download" className={buttonStyles()}>
              {t('release.action')}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        )}
      </Card>
    </section>
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
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </Card>
  )
}

export function HelperPage() {
  return (
    <div className="shell space-y-20 py-16">
      <Hero />
      <QuickStats />
      <ReleaseSection />
      <MediaGallery />
      <VipTeaser />
    </div>
  )
}
