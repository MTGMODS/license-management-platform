import { Megaphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function PromoPage() {
  const { t } = useTranslation('promo')

  return (
    <div className="shell flex flex-col items-center py-28 text-center sm:py-36">
      <span className="grid size-14 place-items-center rounded-2xl bg-accent-500/10 text-accent-300">
        <Megaphone aria-hidden className="size-6" />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h1>
      <p className="mt-3 text-sm whitespace-nowrap text-fg-muted sm:text-base">{t('body')}</p>
    </div>
  )
}
