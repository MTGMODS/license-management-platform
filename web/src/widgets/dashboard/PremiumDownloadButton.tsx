import { Download, FileCode2, MonitorDown, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { usePremiumDownload } from '@/features/license/useLicense'
import { useRelease } from '@/features/release/useRelease'
import { apiErrorTranslationKey } from '@/shared/api'
import { detectDevice } from '@/shared/lib/device'
import { triggerFileDownload } from '@/shared/lib/download'
import { useFocusTrap } from '@/shared/lib/useFocusTrap'
import { Button } from '@/shared/ui'

function DownloadChoice({ onChoose, onDismiss }: {
  onChoose: (installer: boolean) => void
  onDismiss: () => void
}) {
  const { t } = useTranslation('dashboard')
  const panel = useRef<HTMLDivElement>(null)
  useFocusTrap(panel, { onEscape: onDismiss })
  useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [])

  return createPortal(
    <div role="presentation" onClick={onDismiss} className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/75 p-4 backdrop-blur-sm">
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="vip-download-title" tabIndex={-1}
        onClick={event => event.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-ink-700 bg-ink-900 p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id="vip-download-title" className="text-xl font-semibold tracking-tight">{t('download.chooseTitle')}</h2>
          <button type="button" onClick={onDismiss} aria-label={t('download.close')}
            className="rounded-lg p-1 text-fg-subtle transition-colors hover:bg-ink-800 hover:text-fg">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{t('download.chooseHint')}</p>
        <div className="mt-6 grid gap-3">
          {([
            { installer: true, Icon: MonitorDown, title: 'download.installerTitle', hint: 'download.installerHint' },
            { installer: false, Icon: FileCode2, title: 'download.luaTitle', hint: 'download.luaHint' },
          ] as const).map(({ installer, Icon, title, hint }) => (
            <button key={title} type="button" onClick={() => onChoose(installer)}
              className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-colors ${installer
                ? 'border-accent-400/40 bg-accent-500/10 hover:border-accent-400/70 hover:bg-accent-500/15'
                : 'border-white/10 bg-ink-850 hover:border-white/20 hover:bg-ink-800'}`}>
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-500/10 text-accent-300"><Icon aria-hidden className="size-5" /></span>
              <span className="min-w-0"><span className="block font-semibold">{t(title)}</span><span className="mt-1 block text-sm leading-relaxed text-fg-muted">{t(hint)}</span></span>
            </button>
          ))}
        </div>
      </div>
    </div>, document.body,
  )
}

export function PremiumDownloadButton() {
  const { t } = useTranslation('dashboard')
  const { t: te } = useTranslation(['errors'])
  const download = usePremiumDownload()
  const { data: release } = useRelease()
  const [choiceUrl, setChoiceUrl] = useState<string | null>(null)
  const vipLabel = release?.vip?.rawVersion ?? release?.vip?.version
  const reportError = (error: unknown) => toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('errors:unexpected') }))
  const startDownload = (url: string) => {
    triggerFileDownload(url)
    toast.success(t('download.success'), { description: t('download.started') })
  }

  const generate = async () => {
    try {
      const result = await download.mutateAsync()
      if (detectDevice() === 'pc' && /Windows/i.test(navigator.userAgent)) {
        setChoiceUrl(result.download_url)
      } else {
        startDownload(result.download_url)
      }
    } catch (error) { reportError(error) }
  }
  const choose = (installer: boolean) => {
    if (!choiceUrl) return
    try {
      const url = new URL(choiceUrl, window.location.href)
      if (installer) url.pathname += '.exe'
      startDownload(url.href)
      setChoiceUrl(null)
    } catch (error) { reportError(error) }
  }

  return (
    <div className="flex w-full flex-col items-center sm:w-auto">
      <Button size="lg" loading={download.isPending} onClick={() => void generate()}>
        <Download aria-hidden className="size-4" />
        {vipLabel ? t('download.actionVersion', { version: vipLabel }) : t('download.action')}
      </Button>
      <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-fg-subtle">
        <TriangleAlert aria-hidden className="size-3.5 shrink-0 text-caution" />
        {t('download.subtitle')}
      </p>
      {choiceUrl ? <DownloadChoice onChoose={choose} onDismiss={() => setChoiceUrl(null)} /> : null}
    </div>
  )
}
