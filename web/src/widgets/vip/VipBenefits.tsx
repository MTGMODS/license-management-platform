import { Crown, Infinity as InfinityIcon, MessageSquareText, Play, ShieldOff, Sparkles, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { cn } from '@/shared/lib/cn'
import { Badge, Card, buttonStyles } from '@/shared/ui'

const BENEFITS = [
  { icon: InfinityIcon, titleKey: 'benefits.limitsTitle', textKey: 'benefits.limits',
    tone: 'bg-teal-400/10 text-teal-300', border: 'hover:border-teal-400/30',
    placement: 'sm:col-start-1 sm:row-start-2 lg:col-start-2 lg:row-start-1' },
  { icon: ShieldOff, titleKey: 'benefits.adsTitle', textKey: 'benefits.ads',
    tone: 'bg-gradient-to-br from-rose-400/20 to-pink-400/10 text-rose-300', border: 'hover:border-rose-400/30',
    placement: 'sm:col-start-1 sm:row-start-3 lg:col-start-2 lg:row-start-2' },
  { icon: Users, titleKey: 'benefits.communityTitle', textKey: 'benefits.community',
    tone: 'bg-violet-400/10 text-violet-300', border: 'hover:border-violet-400/30',
    placement: 'sm:col-start-2 sm:row-start-2 lg:col-start-3 lg:row-start-1' },
  { icon: MessageSquareText, titleKey: 'benefits.chatTitle', textKey: 'benefits.chat',
    tone: 'bg-accent-500/10 text-accent-300', border: 'hover:border-accent-400/30',
    placement: 'sm:col-start-2 sm:row-start-3 lg:col-start-3 lg:row-start-2' },
] as const

/** One featured benefit + four supporting cards; a single column on phones. */
export function VipBenefits() {
  const { t } = useTranslation('vip')

  return (
    <section aria-labelledby="vip-benefits-title" className="w-full shrink-0">
      <h2 id="vip-benefits-title" className="mb-4 flex items-center justify-center gap-2.5 text-center text-base font-semibold sm:text-lg">
        <Crown aria-hidden className="size-5 shrink-0 text-amber-300" />
        <span className="bg-gradient-to-r from-amber-100 via-amber-200 to-amber-400 bg-clip-text text-transparent">{t('benefits.title')}</span>
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li className="min-w-0 sm:col-span-2 lg:col-span-1 lg:row-span-2">
          <Card className="flex h-full flex-col items-start border-white/8 bg-ink-900/60 bg-gradient-to-br from-amber-400/[0.06] to-transparent p-5 text-left transition-colors hover:border-amber-400/30 lg:p-[clamp(1rem,1.8vh,1.5rem)]">
            <span className="mb-3 grid size-12 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300">
              <Sparkles aria-hidden className="size-6" />
            </span>
            <h3 className="text-base font-semibold leading-snug sm:text-lg lg:text-[clamp(1rem,1.8vh,1.125rem)]">{t('benefits.goldTitle')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted lg:text-[clamp(0.8125rem,1.35vh,0.875rem)]">{t('benefits.gold')}</p>
            <div className="mt-auto pt-4">
              <Link to="/helper" className={buttonStyles({ size: 'sm', variant: 'outline',
                className: 'max-w-full whitespace-normal border-amber-400/25 bg-amber-400/5 text-amber-200 hover:border-amber-400/45 hover:bg-amber-400/10',
              })}>
                <Play aria-hidden className="size-3.5" />
                {t('benefits.watchVideo')}
              </Link>
            </div>
          </Card>
        </li>
        {BENEFITS.map(({ icon: Icon, titleKey, textKey, tone, border, placement }) => (
          <li key={titleKey} className={cn('min-w-0', placement)}>
            <Card className={cn('flex h-full items-start gap-3 border-white/8 bg-ink-900/60 p-4 text-left transition-colors lg:p-[clamp(0.875rem,1.6vh,1.25rem)]', border)}>
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone)}>
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold leading-snug lg:text-[clamp(0.875rem,1.5vh,1rem)]">
                  <span>{t(titleKey)}</span>
                  {titleKey === 'benefits.chatTitle' ? (
                    <>
                      {' '}
                      <Badge tone="neutral" className="px-2 py-0.5 text-[0.625rem] font-semibold">{t('benefits.soon')}</Badge>
                    </>
                  ) : null}
                </h3>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-fg-muted lg:text-[clamp(0.8125rem,1.35vh,0.875rem)]">{t(textKey)}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
