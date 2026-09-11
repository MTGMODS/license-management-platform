import { Gift } from 'lucide-react'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import leadersImage from '@/assets/promo/leaders.png'
import smartImage from '@/assets/promo/smart.png'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui'

function FitOneLine({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const fit = () => {
      el.style.fontSize = ''
      let size = Number.parseFloat(getComputedStyle(el).fontSize)
      while (el.scrollWidth > el.clientWidth + 1 && size > 8) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [children])

  return (
    <p
      ref={ref}
      className="w-full min-w-0 shrink-0 text-center text-[clamp(0.5rem,2.2cqi,0.7rem)] leading-none whitespace-nowrap text-fg-subtle"
    >
      {children}
    </p>
  )
}

function PromoBanner({
  to,
  image,
  title,
  lead,
  reward,
  hint,
}: {
  to: string
  image: string
  title: string
  lead: string
  reward: string
  hint: string
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-0 flex-1 rounded-2xl outline-none transition-[border-color,background-color] focus-visible:ring-2 focus-visible:ring-accent-400/50"
    >
      <Card
        className={cn(
          '@container flex h-full min-h-0 w-full flex-col justify-start border border-white/8',
          'gap-[clamp(0.35rem,1.1vh,1.25rem)] p-[clamp(0.6rem,1.5vh,2rem)]',
          'transition-[border-color,background-color] group-hover:border-accent-400/40 group-hover:bg-ink-800/80',
        )}
      >
        <div className="shrink-0 space-y-[clamp(0.2rem,0.55vh,0.5rem)] text-center">
          <h2 className="text-[clamp(0.95rem,2.4vh,2.25rem)] font-semibold tracking-tight">
            {title}
          </h2>
          <p className="text-[clamp(0.7rem,1.3vh,1.125rem)] leading-snug text-fg-muted">
            {lead}
          </p>
        </div>
        <div className="relative min-h-0 w-full min-w-0 flex-1 overflow-hidden rounded-xl ring-1 ring-white/8">
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>
        <p
          className={cn(
            'shrink-0 text-center font-medium text-accent-200',
            'text-[clamp(0.85rem,1.85vh,1.375rem)] leading-snug',
          )}
        >
          <Gift aria-hidden className="mr-1.5 mb-0.5 inline size-[1em] align-[-0.15em]" />
          {reward}
        </p>
        <div className="mt-[clamp(0.2rem,0.85vh,0.55rem)] shrink-0">
          <FitOneLine>{hint}</FitOneLine>
        </div>
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
        'py-[clamp(0.5rem,1.4vh,1.75rem)]',
      )}
    >
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-[clamp(0.85rem,2.8vh,2.5rem)]',
          'lg:max-h-[min(65dvh,42rem)]',
        )}
      >
        <header className="mx-auto w-full max-w-3xl shrink-0 space-y-[clamp(0.2rem,0.6vh,0.75rem)] text-center">
          <h1
            className={cn(
              'text-gradient font-semibold tracking-tight',
              'text-[clamp(1.35rem,3.4vh,3.25rem)]',
            )}
          >
            {t('hub.title')}
          </h1>
          <p className="text-[clamp(0.75rem,1.45vh,1.2rem)] leading-snug text-fg-muted">
            {t('hub.subtitle')}
          </p>
        </header>

        <div
          className={cn(
            'grid min-h-0 flex-1 grid-cols-1 grid-rows-2 gap-[clamp(0.4rem,1.2vh,1.5rem)]',
            'lg:grid-cols-2 lg:grid-rows-1 lg:gap-[clamp(0.75rem,1.6vh,2rem)]',
          )}
        >
          <PromoBanner
            to="/promo/leaders"
            image={leadersImage}
            title={t('hub.leaders.title')}
            lead={t('hub.leaders.lead')}
            reward={t('hub.leaders.reward')}
            hint={t('hub.clickHint')}
          />
          <PromoBanner
            to="/promo/smart"
            image={smartImage}
            title={t('hub.smart.title')}
            lead={t('hub.smart.lead')}
            reward={t('hub.smart.reward')}
            hint={t('hub.clickHint')}
          />
        </div>
      </div>
    </div>
  )
}
