import { ExternalLink, Gift } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { PROMO_LINKS } from '@/shared/config/promo'
import { buttonStyles, Card } from '@/shared/ui'
import { DiscordIcon, GithubIcon, TelegramIcon } from '@/shared/ui/BrandIcons'

import {
  PromoBackLink,
  PromoCopySnippet,
  PromoCtaLink,
  PromoLinkChip,
  PromoSectionHeader,
  PromoSteps,
} from './promoUi'

export function PromoLeadersPage() {
  const { t } = useTranslation('promo')

  return (
    <div className="shell flex flex-col gap-8 py-8 sm:gap-10 sm:py-10">
      <PromoBackLink label={t('leaders.back')} />

      <PromoSectionHeader
        eyebrow={t('leaders.audience')}
        title={t('leaders.title')}
        lead={t('leaders.lead')}
      />

      <p className="inline-flex items-center gap-2 text-sm font-medium text-accent-200">
        <Gift aria-hidden className="size-4 shrink-0" />
        {t('leaders.reward')}
      </p>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold tracking-tight sm:text-lg">
              {t('leaders.download.title')}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">{t('leaders.download.body')}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/helper"
              className="inline-flex items-center gap-2 rounded-xl border border-accent-400/40 bg-accent-500/10 px-3 py-2 text-sm font-medium text-accent-200 transition-colors hover:bg-accent-500/20"
            >
              {t('leaders.download.site')}
              <ExternalLink aria-hidden className="size-3.5 opacity-60" />
            </Link>
            <PromoLinkChip
              href={PROMO_LINKS.telegramHelper}
              label={t('leaders.download.telegram')}
              icon={<TelegramIcon className="size-4" />}
            />
            <PromoLinkChip
              href={PROMO_LINKS.discordServer}
              label={t('leaders.download.discord')}
              icon={<DiscordIcon className="size-4" />}
            />
            <PromoLinkChip href={PROMO_LINKS.blastHack} label={t('leaders.download.blastHack')} />
            <PromoLinkChip
              href={PROMO_LINKS.githubLua}
              label={t('leaders.download.github')}
              icon={<GithubIcon className="size-4" />}
            />
          </div>

          <PromoCopySnippet
            label={t('leaders.download.copyHint')}
            value={t('leaders.download.copyText')}
          />
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3 p-5 sm:p-6">
            <h2 className="text-base font-semibold tracking-tight sm:text-lg">
              {t('leaders.board.title')}
            </h2>
            <p className="text-sm text-fg-muted">{t('leaders.board.body')}</p>
            <PromoCopySnippet label={t('leaders.board.title')} value={t('leaders.board.snippet')} />
          </Card>

          <Card className="space-y-3 p-5 sm:p-6">
            <h2 className="text-base font-semibold tracking-tight sm:text-lg">
              {t('leaders.promo.title')}
            </h2>
            <p className="text-sm text-fg-muted">{t('leaders.promo.body')}</p>
            <PromoCopySnippet label={t('leaders.promo.title')} value={t('leaders.promo.snippet')} />
          </Card>
        </div>
      </div>

      <Card className="space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">
          {t('leaders.claim.title')}
        </h2>
        <PromoSteps
          items={[t('leaders.claim.step1'), t('leaders.claim.step2'), t('leaders.claim.step3')]}
        />
        <p className="text-sm text-fg-muted">{t('leaders.claim.done')}</p>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <PromoCtaLink href={PROMO_LINKS.contactTelegram}>
            <TelegramIcon className="size-4" />
            {t('leaders.cta')}
          </PromoCtaLink>
          <a
            href={PROMO_LINKS.telegramVip}
            target="_blank"
            rel="noreferrer"
            className={buttonStyles({ variant: 'secondary' })}
          >
            {t('leaders.ctaVip')}
            <ExternalLink aria-hidden className="size-3.5 opacity-60" />
          </a>
        </div>
      </Card>
    </div>
  )
}
