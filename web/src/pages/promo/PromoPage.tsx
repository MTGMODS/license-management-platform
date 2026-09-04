import { ArrowRight, Gift } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { cn } from '@/shared/lib/cn'
import { buttonStyles, Card } from '@/shared/ui'

function PromoBanner({
  to,
  title,
  lead,
  reward,
  more,
}: {
  to: string
  title: string
  lead: string
  reward: string
  more: string
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-0 flex-1 rounded-2xl outline-none transition-[border-color,background-color] focus-visible:ring-2 focus-visible:ring-accent-400/50"
    >
      <Card
        className={cn(
          'flex h-full w-full flex-col justify-center border border-white/8',
          'gap-[clamp(0.4rem,1vh,1rem)] p-[clamp(0.7rem,1.6vh,2rem)]',
          'transition-[border-color,background-color] group-hover:border-accent-400/40 group-hover:bg-ink-800/80',
        )}
      >
        <div className="space-y-[clamp(0.2rem,0.55vh,0.5rem)]">
          <h2 className="text-[clamp(1rem,2.2vh,1.75rem)] font-semibold tracking-tight">
            {title}
          </h2>
          <p className="max-w-3xl text-[clamp(0.75rem,1.35vh,1.0625rem)] leading-snug text-fg-muted">
            {lead}
          </p>
        </div>
        <p className="inline-flex items-center gap-2 text-[clamp(0.7rem,1.25vh,0.9375rem)] font-medium text-accent-200">
          <Gift aria-hidden className="size-[1em] shrink-0" />
          {reward}
        </p>
        <span
          className={buttonStyles({
            size: 'sm',
            className: 'pointer-events-none w-fit',
          })}
        >
          {more}
          <ArrowRight aria-hidden className="size-4" />
        </span>
      </Card>
    </Link>
  )
}

export function PromoPage() {
  const { t } = useTranslation('promo')

  return (
    <div
      className={cn(
        'shell flex min-h-0 flex-1 flex-col overflow-hidden',
        'gap-[clamp(0.55rem,1.4vh,1.25rem)] py-[clamp(0.55rem,1.5vh,1.5rem)]',
        'lg:pb-[clamp(0.55rem,1.5vh,1.5rem)]',
      )}
    >
      <header className="mx-auto w-full max-w-3xl shrink-0 space-y-[clamp(0.25rem,0.65vh,0.75rem)] text-center">
        <h1
          className={cn(
            'text-gradient font-semibold tracking-tight',
            'text-[clamp(1.5rem,3.2vh,2.5rem)]',
          )}
        >
          {t('hub.title')}
        </h1>
        <p className="text-[clamp(0.8rem,1.45vh,1.125rem)] leading-snug text-fg-muted">
          {t('hub.subtitle')}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-[clamp(0.4rem,1.1vh,1rem)]">
        <PromoBanner
          to="/promo/leaders"
          title={t('hub.leaders.title')}
          lead={t('hub.leaders.lead')}
          reward={t('hub.leaders.reward')}
          more={t('hub.more')}
        />
        <PromoBanner
          to="/promo/smart"
          title={t('hub.smart.title')}
          lead={t('hub.smart.lead')}
          reward={t('hub.smart.reward')}
          more={t('hub.more')}
        />
      </div>
    </div>
  )
}
