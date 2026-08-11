import { Download, FileCode2, Monitor, PlayCircle, Smartphone, Sparkles, Wand2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { isInstallerAvailable } from '@/features/download/installer'
import { useRelease } from '@/features/release/useRelease'
import { FREE_LUA_FALLBACK_URL, HELPER_VIDEO_ID, PC_INSTALLER_URL } from '@/shared/config/product'
import { detectDevice, type DeviceKind } from '@/shared/lib/device'
import { triggerFileDownload } from '@/shared/lib/download'
import { cn } from '@/shared/lib/cn'
import { Badge, Button, Card, Skeleton } from '@/shared/ui'

function VersionBadge() {
  const { t } = useTranslation('download')
  const { data, isPending, isError } = useRelease()

  if (isPending) {
    return <Skeleton className="h-7 w-36" label={t('version.loading')} />
  }

  if (isError || !data) {
    return <Badge tone="neutral">{t('version.unknown')}</Badge>
  }

  return (
    <Badge tone="accent">
      <Sparkles aria-hidden className="size-3.5" />
      <span className="tabular">
        {t('version.label')}: {data.free.version}
      </span>
    </Badge>
  )
}

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
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-fg-muted">{t('device.label')}</span>
      <div role="group" className="flex rounded-xl bg-ink-800 p-1 ring-1 ring-white/5">
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
                'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200',
                active ? 'bg-ink-700 text-fg' : 'text-fg-subtle hover:text-fg-muted',
              )}
            >
              <Icon aria-hidden className="size-4" />
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="mt-5 space-y-3">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-sm text-fg-muted">
          <span className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-ink-750 text-xs font-semibold text-fg-subtle">
            {index + 1}
          </span>
          <span className="pt-0.5 leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  )
}

function InstallCard({
  icon,
  title,
  body,
  badge,
  children,
}: {
  icon: ReactNode
  title: string
  body: string
  badge?: string
  children: ReactNode
}) {
  return (
    <Card className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-300">
            {icon}
          </span>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        {badge ? <Badge tone="accent">{badge}</Badge> : null}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-fg-muted">{body}</p>

      <div className="mt-auto">{children}</div>
    </Card>
  )
}

function useLuaDownload() {
  const { t } = useTranslation('download')
  const { data } = useRelease()

  return () => {
    // The manifest carries the canonical link, so the download always matches
    // the version shown above. The config value is only a safety net.
    triggerFileDownload(data?.freeDownloadUrl ?? FREE_LUA_FALLBACK_URL)
    toast.success(t('toast.started'))
  }
}

function PcInstall() {
  const { t } = useTranslation('download')
  const downloadLua = useLuaDownload()
  const [checkingInstaller, setCheckingInstaller] = useState(false)

  const handleInstaller = async () => {
    setCheckingInstaller(true)
    try {
      const available = await isInstallerAvailable(PC_INSTALLER_URL)

      if (!available) {
        toast.error(t('toast.installerMissing'), {
          description: t('toast.installerMissingHint'),
        })
        return
      }

      triggerFileDownload(PC_INSTALLER_URL)
      toast.success(t('toast.started'))
    } finally {
      setCheckingInstaller(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InstallCard
        icon={<Wand2 aria-hidden className="size-5" />}
        title={t('pc.auto.title')}
        body={t('pc.auto.body')}
        badge={t('pc.auto.badge')}
      >
        <Button
          className="mt-6"
          fullWidth
          loading={checkingInstaller}
          onClick={() => void handleInstaller()}
        >
          <Download aria-hidden className="size-4" />
          {t('pc.auto.action')}
        </Button>
      </InstallCard>

      <InstallCard
        icon={<FileCode2 aria-hidden className="size-5" />}
        title={t('pc.manual.title')}
        body={t('pc.manual.body')}
      >
        <Steps
          items={[
            t('pc.manual.steps.download'),
            t('pc.manual.steps.openFolder'),
            t('pc.manual.steps.moveFile'),
            t('pc.manual.steps.restart'),
          ]}
        />
        <Button className="mt-6" variant="secondary" fullWidth onClick={downloadLua}>
          <Download aria-hidden className="size-4" />
          {t('pc.manual.action')}
        </Button>
      </InstallCard>
    </div>
  )
}

function MobileInstall() {
  const { t } = useTranslation('download')
  const downloadLua = useLuaDownload()

  return (
    <InstallCard
      icon={<Smartphone aria-hidden className="size-5" />}
      title={t('mobile.title')}
      body={t('mobile.body')}
    >
      <Steps
        items={[
          t('mobile.steps.monet'),
          t('mobile.steps.download'),
          t('mobile.steps.moveFile'),
          t('mobile.steps.restart'),
        ]}
      />
      <Button className="mt-6" fullWidth onClick={downloadLua}>
        <Download aria-hidden className="size-4" />
        {t('mobile.action')}
      </Button>
    </InstallCard>
  )
}

function VideoGuide() {
  const { t } = useTranslation('download')

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold tracking-tight">{t('guide.title')}</h2>
      <p className="mt-1 text-sm text-fg-muted">{t('guide.body')}</p>

      <div className="mt-5 overflow-hidden rounded-card border border-white/5 bg-ink-850">
        {HELPER_VIDEO_ID ? (
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${HELPER_VIDEO_ID}`}
              title={t('guide.title')}
              allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="size-full border-0"
            />
          </div>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-3 text-fg-subtle">
            <PlayCircle aria-hidden className="size-10" />
            <p className="text-sm">{t('guide.soon')}</p>
          </div>
        )}
      </div>
    </section>
  )
}

export function DownloadPage() {
  const { t } = useTranslation('download')
  const [device, setDevice] = useState<DeviceKind>('pc')

  // Detection runs after mount so the markup stays deterministic and the
  // manual override is never overwritten on a later render.
  useEffect(() => {
    setDevice(detectDevice())
  }, [])

  return (
    <div className="shell py-16">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">{t('title')}</h1>
        <VersionBadge />
      </div>
      <p className="mt-3 text-fg-muted">{t('subtitle')}</p>

      <div className="mt-8">
        <DeviceToggle device={device} onChange={setDevice} />
      </div>

      <div className="mt-8">{device === 'pc' ? <PcInstall /> : <MobileInstall />}</div>

      <VideoGuide />
    </div>
  )
}
