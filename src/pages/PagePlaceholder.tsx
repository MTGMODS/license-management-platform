import { Hammer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Temporary shell for routes whose content is still being built. */
export function PagePlaceholder({ title }: { title: string }) {
  const { t } = useTranslation('common')

  return (
    <div className="shell py-24">
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-8 flex items-center gap-3 rounded-card border border-white/5 bg-ink-850 px-5 py-4">
        <Hammer aria-hidden className="size-5 shrink-0 text-fg-subtle" />
        <div>
          <p className="font-medium text-fg">{t('wip.title')}</p>
          <p className="mt-0.5 text-sm text-fg-muted">{t('wip.body')}</p>
        </div>
      </div>
    </div>
  )
}
