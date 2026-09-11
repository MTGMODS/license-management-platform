import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PROMO_LINKS } from '@/shared/config/promo'
import { buttonStyles, Card } from '@/shared/ui'
import { TelegramIcon } from '@/shared/ui/BrandIcons'

import {
  PromoBackLink,
  PromoCopySnippet,
  PromoCtaLink,
  PromoSectionHeader,
  PromoSteps,
} from './promoUi'

export function PromoLeadersPage() {
  const { t } = useTranslation('promo')
  const copyText = t('leaders.copyText')

  return (
    <div className="shell flex flex-col gap-8 py-8 sm:gap-10 sm:py-10">
      <PromoBackLink label={t('leaders.back')} />

      <PromoSectionHeader title={t('leaders.title')} lead={t('leaders.lead')} />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="space-y-3 p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">
            {t('leaders.board.title')}
          </h2>
          <p className="text-sm text-fg-muted">{t('leaders.board.body')}</p>
          <PromoCopySnippet value={copyText} />
        </Card>

        <Card className="space-y-3 p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">
            {t('leaders.promo.title')}
          </h2>
          <p className="text-sm text-fg-muted">{t('leaders.promo.body')}</p>
          <PromoCopySnippet value={copyText} />
        </Card>
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
