import { CheckCircle2, X } from 'lucide-react'
import { useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Button } from '@/shared/ui'

export type ActivateSuccessMode = 'first' | 'renewal'

const TERMS_LINK =
  'text-sky-300 underline decoration-sky-300/50 underline-offset-2 transition-colors hover:text-sky-200'

function ActivationWarning() {
  const { t } = useTranslation('dashboard')

  return (
    <div className="mt-6 rounded-xl border-l-4 border-caution/70 bg-ink-800/80 px-4 py-4 text-center sm:px-5 sm:py-5">
      <p className="text-sm font-medium text-fg">{t('activate.successSlide.warningTitle')}</p>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted sm:text-[0.95rem]">
        {t('activate.successSlide.warningBody1')}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-[0.95rem]">
        <Trans
          i18nKey="activate.successSlide.warningBody2"
          ns="dashboard"
          components={{
            terms: <Link to="/terms" className={TERMS_LINK} />,
          }}
        />
      </p>
    </div>
  )
}

export function ActivateSuccessOverlay({
  mode,
  onClose,
}: {
  mode: ActivateSuccessMode
  onClose: () => void
}) {
  const { t } = useTranslation('dashboard')

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/75 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="activate-success-title"
        className="relative inline-flex max-h-[min(90dvh,44rem)] max-w-[calc(100vw-2rem)] flex-col overflow-y-auto rounded-2xl border border-ink-700 bg-ink-900 px-5 py-7 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] sm:px-7 sm:py-9"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('activate.successSlide.close')}
          className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-ink-800 hover:text-fg sm:right-4 sm:top-4"
        >
          <X aria-hidden className="size-5" />
        </button>

        <div className="inline-flex max-w-full flex-col items-center pt-8 text-center">
          {mode === 'renewal' ? (
            <>
              <p className="text-4xl leading-none sm:text-5xl" aria-hidden>
                🎉
              </p>
              <h2
                id="activate-success-title"
                className="mt-4 whitespace-nowrap text-xl font-semibold tracking-tight sm:text-2xl"
              >
                {t('activate.successSlide.renewalTitle')}
              </h2>
            </>
          ) : (
            <>
              <span className="grid size-14 place-items-center rounded-2xl bg-positive/15 text-positive sm:size-16">
                <CheckCircle2 aria-hidden className="size-7 sm:size-8" strokeWidth={2} />
              </span>
              <h2
                id="activate-success-title"
                className="mt-5 whitespace-nowrap text-xl font-semibold tracking-tight sm:text-2xl"
              >
                {t('activate.successSlide.firstTitle')}
              </h2>
            </>
          )}

          <div className="w-0 min-w-full">
            {mode === 'first' ? (
              <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">
                {t('activate.successSlide.firstSubtitle')}
              </p>
            ) : null}

            <ActivationWarning />

            <Button type="button" size="lg" fullWidth className="mt-6" onClick={onClose}>
              {mode === 'first'
                ? t('activate.successSlide.ctaFirst')
                : t('activate.successSlide.ctaRenewal')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
