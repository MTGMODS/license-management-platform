import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useFocusTrap } from '@/shared/lib/useFocusTrap'
import { Button } from '@/shared/ui'

export function AuthPopupBlockedDialog({
  onRetry,
  onDismiss,
}: {
  onRetry: () => void
  onDismiss: () => void
}) {
  const { t } = useTranslation('login')
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, { onEscape: onDismiss })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/75 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onDismiss}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-blocked-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="popup-blocked-title" className="text-xl font-semibold tracking-tight">
          {t('popupBlocked.title')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t('popupBlocked.body')}</p>
        <div className="mt-7 flex flex-col gap-3">
          <Button type="button" variant="primary" size="lg" fullWidth onClick={onRetry}>
            {t('popupBlocked.allow')}
          </Button>
          <Button type="button" variant="ghost" size="md" fullWidth onClick={onDismiss}>
            {t('popupBlocked.cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}
