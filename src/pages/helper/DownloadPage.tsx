import {
  Download,
  ExternalLink,
  FileCode2,
  Monitor,
  PlayCircle,
  Smartphone,
  Wand2,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useRelease } from '@/features/release/useRelease'
import {
  FREE_LUA_FALLBACK_URL,
  MOBILE_MANUAL_GUIDE_URL,
  MOBILE_X32_GUIDE_URL,
  MOBILE_X64_GUIDE_URL,
  MONETLOADER_X32_URL,
  MONETLOADER_X64_URL,
  PC_INSTALLER_URL,
  PC_MANUAL_GUIDE_URL,
} from '@/shared/config/product'
import { cn } from '@/shared/lib/cn'
import { detectDevice, type DeviceKind } from '@/shared/lib/device'
import { triggerFileDownload } from '@/shared/lib/download'
import { Badge, Button, buttonStyles, Card } from '@/shared/ui'

function DeviceToggle({
  device,
  onChange,
}: {
  device: DeviceKind
  onChange: (next: DeviceKind) => void
}) {
  const { t } = useTranslation('download')

  const options: { id: DeviceKind; label: string; icon: typeof Monitor }[] = [
    { id: 'pc', label: t('device.pc'), icon: Monitor },
    { id: 'mobile', label: t('device.mobile'), icon: Smartphone },
  ]

  return (
    <div role="group" className="grid w-full grid-cols-2 gap-2 sm:gap-3">
      {options.map((option) => {
        const Icon = option.icon
        const active = option.id === device
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'inline-flex items-center justify-center gap-2.5 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-[background-color,border-color,color] sm:py-4 sm:text-base',
              active
                ? 'border border-accent-400/50 bg-accent-500/10 text-fg shadow-[0_0_0_1px_rgba(56,189,248,0.12)]'
                : 'border border-white/8 bg-ink-850/80 text-fg-muted hover:border-white/14 hover:bg-ink-800 hover:text-fg',
            )}
          >
            <Icon aria-hidden className="size-5 shrink-0" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 text-sm text-fg-muted">
          <span className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-ink-750 text-xs font-semibold text-fg-subtle">
            {index + 1}
          </span>
          <span className="min-w-0 pt-0.5 leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  )
}

function GuideLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={buttonStyles({ variant: 'secondary', size: 'lg', fullWidth: true })}
    >
      <PlayCircle aria-hidden className="size-4" />
      {children}
      <ExternalLink aria-hidden className="size-3.5 opacity-60" />
    </a>
  )
}

function InstallCard({
  icon,
  title,
  body,
  badge,
  children,
  actions,
  className,
}: {
  icon: ReactNode
  title: string
  body?: string
  badge?: string
  children?: ReactNode
  actions: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('flex h-full min-w-0 flex-col p-5 sm:p-6', className)}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-300">
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
          <h2 className="min-w-0 text-lg font-semibold tracking-tight">{title}</h2>
          {badge ? (
            <Badge tone="accent" className="max-w-full px-2 py-0.5 text-[0.65rem] leading-tight whitespace-normal">
              {badge}
            </Badge>
          ) : null}
        </div>
      </div>

      {body ? <p className="mt-4 text-sm leading-relaxed text-fg-muted">{body}</p> : null}
      {children ? <div className="mt-4 flex-1">{children}</div> : <div className="flex-1" />}

      <div className="mt-auto flex flex-col gap-2.5 pt-5">{actions}</div>
    </Card>
  )
}

function useLuaDownload() {
  const { t } = useTranslation('download')
  const { data } = useRelease()

  return () => {
    triggerFileDownload(data?.freeDownloadUrl ?? FREE_LUA_FALLBACK_URL)
    toast.success(t('toast.started'))
  }
}

function PcInstall() {
  const { t } = useTranslation('download')
  const downloadLua = useLuaDownload()

  const handleInstaller = () => {
    triggerFileDownload(PC_INSTALLER_URL)
    toast.success(t('toast.started'))
  }

  const actionRow = 'flex flex-col gap-2.5 sm:flex-row'

  return (
    <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      <InstallCard
        icon={<Wand2 aria-hidden className="size-5" />}
        title={t('pc.auto.title')}
        badge={t('pc.auto.badge')}
        actions={
          <div className={actionRow}>
            <Button size="lg" fullWidth className="sm:flex-1" onClick={handleInstaller}>
              <Download aria-hidden className="size-4" />
              {t('pc.auto.action')}
            </Button>
          </div>
        }
      >
        <Steps
          items={[
            t('pc.auto.steps.download'),
            t('pc.auto.steps.open'),
            t('pc.auto.steps.find'),
            t('pc.auto.steps.install'),
            t('pc.auto.steps.done'),
          ]}
        />
      </InstallCard>

      <InstallCard
        icon={<FileCode2 aria-hidden className="size-5" />}
        title={t('pc.manual.title')}
        badge={t('pc.manual.badge')}
        actions={
          <div className={actionRow}>
            <Button size="lg" variant="secondary" fullWidth className="sm:flex-1" onClick={downloadLua}>
              <Download aria-hidden className="size-4" />
              {t('pc.manual.action')}
            </Button>
            <a
              href={PC_MANUAL_GUIDE_URL}
              target="_blank"
              rel="noreferrer"
              className={buttonStyles({
                variant: 'secondary',
                size: 'lg',
                fullWidth: true,
                className: 'sm:flex-1',
              })}
            >
              <PlayCircle aria-hidden className="size-4" />
              {t('pc.manual.guide')}
              <ExternalLink aria-hidden className="size-3.5 opacity-60" />
            </a>
          </div>
        }
      >
        <Steps
          items={[
            t('pc.manual.steps.moonloader'),
            t('pc.manual.steps.download'),
            t('pc.manual.steps.open'),
            t('pc.manual.steps.place'),
            t('pc.manual.steps.done'),
          ]}
        />
      </InstallCard>
    </div>
  )
}

function MobileInstall() {
  const { t } = useTranslation('download')
  const downloadLua = useLuaDownload()

  return (
    <div className="space-y-6">
      <InstallCard
        icon={<Smartphone aria-hidden className="size-5" />}
        title={t('mobile.auto.title')}
        badge={t('mobile.auto.badge')}
        actions={
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-5">
            <div className="flex min-w-0 flex-col gap-2.5">
              <a
                href={MONETLOADER_X32_URL}
                target="_blank"
                rel="noreferrer"
                className={buttonStyles({ size: 'lg', fullWidth: true })}
              >
                <Download aria-hidden className="size-4" />
                {t('mobile.auto.x32.action')}
                <ExternalLink aria-hidden className="size-3.5 opacity-70" />
              </a>
              <GuideLink href={MOBILE_X32_GUIDE_URL}>{t('mobile.auto.x32.guide')}</GuideLink>
            </div>

            <div className="flex min-w-0 flex-col gap-2.5 border-t border-white/8 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
              <a
                href={MONETLOADER_X64_URL}
                target="_blank"
                rel="noreferrer"
                className={buttonStyles({ size: 'lg', fullWidth: true })}
              >
                <Download aria-hidden className="size-4" />
                {t('mobile.auto.x64.action')}
                <ExternalLink aria-hidden className="size-3.5 opacity-70" />
              </a>
              <GuideLink href={MOBILE_X64_GUIDE_URL}>{t('mobile.auto.x64.guide')}</GuideLink>
            </div>
          </div>
        }
      >
        <Steps
          items={[
            t('mobile.auto.steps.download'),
            t('mobile.auto.steps.install'),
            t('mobile.auto.steps.select'),
          ]}
        />
      </InstallCard>

      <InstallCard
        icon={<FileCode2 aria-hidden className="size-5" />}
        title={t('mobile.manual.title')}
        badge={t('mobile.manual.badge')}
        actions={
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button size="lg" fullWidth className="sm:flex-1" onClick={downloadLua}>
              <Download aria-hidden className="size-4" />
              {t('mobile.manual.action')}
            </Button>
            <a
              href={MOBILE_MANUAL_GUIDE_URL}
              target="_blank"
              rel="noreferrer"
              className={buttonStyles({
                variant: 'secondary',
                size: 'lg',
                fullWidth: true,
                className: 'sm:flex-1',
              })}
            >
              <PlayCircle aria-hidden className="size-4" />
              {t('mobile.manual.guide')}
              <ExternalLink aria-hidden className="size-3.5 opacity-60" />
            </a>
          </div>
        }
      >
        <Steps
          items={[
            t('mobile.manual.steps.launcher'),
            t('mobile.manual.steps.download'),
            t('mobile.manual.steps.open'),
            t('mobile.manual.steps.place'),
            t('mobile.manual.steps.done'),
          ]}
        />
      </InstallCard>
    </div>
  )
}

/** Shrinks a single line to the parent width. */
function FitLine({
  className,
  maxRem,
  children,
}: {
  className?: string
  maxRem: number
  children: ReactNode
}) {
  const ref = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return

    const fit = () => {
      el.style.fontSize = `${maxRem}rem`
      const available = parent.clientWidth
      const needed = el.scrollWidth
      if (needed > available && needed > 0) {
        el.style.fontSize = `${((maxRem * available) / needed) * 0.98}rem`
      }
    }

    fit()
    void document.fonts?.ready.then(fit)
    const observer = new ResizeObserver(fit)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [children, maxRem])

  return (
    <p ref={ref} className={cn('block w-max max-w-full whitespace-nowrap', className)}>
      {children}
    </p>
  )
}

export function DownloadPage() {
  const { t } = useTranslation('download')
  const { data } = useRelease()
  const [device, setDevice] = useState<DeviceKind>('pc')
  const version = data?.free.rawVersion

  useEffect(() => {
    setDevice(detectDevice())
  }, [])

  return (
    <div className="shell min-w-0 py-10 sm:py-14">
      <header className="w-full min-w-0 overflow-x-clip">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {version ? t('titleVersion', { version }) : t('title')}
        </h1>
        <div className="mt-3 w-full min-w-0">
          <FitLine maxRem={0.875} className="leading-snug text-fg-subtle">
            <Trans
              i18nKey="legalNotice"
              ns="download"
              components={{
                terms: (
                  <Link
                    to="/terms"
                    className="text-accent-300 underline decoration-accent-500/40 underline-offset-2 transition-colors hover:text-accent-200"
                  />
                ),
              }}
            />
          </FitLine>
        </div>
      </header>

      <div className="mt-8 sm:mt-10">
        <DeviceToggle device={device} onChange={setDevice} />
      </div>

      <div className="mt-6 min-w-0 sm:mt-8">
        {device === 'pc' ? <PcInstall /> : <MobileInstall />}
      </div>
    </div>
  )
}
