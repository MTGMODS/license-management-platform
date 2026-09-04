import { Gift } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PROMO_LINKS } from '@/shared/config/promo'
import { Card } from '@/shared/ui'
import { DiscordIcon } from '@/shared/ui/BrandIcons'

import {
  PromoBackLink,
  PromoBulletList,
  PromoCtaLink,
  PromoSectionHeader,
} from './promoUi'

export function PromoSmartPage() {
  const { t } = useTranslation('promo')

  return (
    <div className="shell flex flex-col gap-8 py-8 sm:gap-10 sm:py-10">
      <PromoBackLink label={t('smart.back')} />

      <PromoSectionHeader
        eyebrow={t('smart.audience')}
        title={t('smart.title')}
        lead={t('smart.lead')}
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="space-y-4 p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">
            {t('smart.role.title')}
          </h2>
          <PromoBulletList
            items={[
              t('smart.role.item1'),
              t('smart.role.item2'),
              t('smart.role.item3'),
              t('smart.role.item4'),
            ]}
          />
        </Card>

        <Card className="space-y-4 p-5 sm:p-6">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
            <Gift aria-hidden className="size-4 text-accent-300" />
            {t('smart.reward.title')}
          </h2>
          <p className="text-sm leading-relaxed text-fg-muted">{t('smart.reward.body')}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <PromoCtaLink href={PROMO_LINKS.discordServer}>
          <DiscordIcon className="size-4" />
          {t('smart.ctaDiscord')}
        </PromoCtaLink>
        <p className="text-sm text-fg-muted sm:max-w-md">{t('smart.ctaHelp')}</p>
      </div>
    </div>
  )
}
