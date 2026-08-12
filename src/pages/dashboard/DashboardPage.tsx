import { Crown, Download, KeyRound, Loader2, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useAuthStore } from '@/features/auth/authStore'
import {
  useActivateKey,
  useLicenseInfo,
  usePremiumDownload,
  useResetDevice,
} from '@/features/license/useLicense'
import { ApiError, apiErrorTranslationKey } from '@/shared/api'
import {
  LICENSE_KEY_LENGTH,
  LICENSE_KEY_PATTERN,
  type LicenseInfo,
  type LicenseStatus,
} from '@/shared/api/license'
import { millisecondsUntil } from '@/shared/lib/datetime'
import { triggerFileDownload } from '@/shared/lib/download'
import { useFormatters } from '@/shared/lib/format'
import { Badge, Button, buttonStyles, Card, Skeleton } from '@/shared/ui'

/** Formats the raw input into the backend's `XXXX-XXXX-XXXX-XXXX` shape. */
function formatLicenseKey(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)
  const parts = cleaned.match(/.{1,4}/g)
  return parts ? parts.join('-') : ''
}

function statusTone(status: LicenseStatus): 'positive' | 'caution' | 'negative' | 'neutral' {
  switch (status) {
    case 'ACTIVE':
      return 'positive'
    case 'EXPIRED':
      return 'caution'
    case 'BANNED':
      return 'negative'
    default:
      return 'neutral'
  }
}

function ActivateForm() {
  const { t } = useTranslation('dashboard')
  const { t: te } = useTranslation(['errors'])
  const activate = useActivateKey()
  const [value, setValue] = useState('')
  const [pendingForce, setPendingForce] = useState<string | null>(null)

  const valid = LICENSE_KEY_PATTERN.test(value)

  const submit = async (key: string, force: boolean) => {
    try {
      await activate.mutateAsync({ key, force })
      toast.success(t('activate.success'))
      setValue('')
      setPendingForce(null)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ACTIVE_LICENSE_EXISTS' && !force) {
        setPendingForce(key)
        return
      }

      toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('errors:unexpected') }))
    }
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid || activate.isPending) return
    void submit(value, false)
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-accent-500/10 text-accent-300">
          <KeyRound aria-hidden className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('activate.title')}</h2>
          <p className="text-sm text-fg-muted">{t('activate.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={value}
          onChange={(event) => setValue(formatLicenseKey(event.target.value))}
          placeholder={t('activate.placeholder')}
          maxLength={LICENSE_KEY_LENGTH}
          spellCheck={false}
          autoComplete="off"
          className="tabular flex-1 rounded-xl border border-white/8 bg-ink-800 px-4 py-3 text-sm tracking-wider text-fg outline-none placeholder:text-fg-subtle focus:border-accent-500/40"
        />
        <Button type="submit" disabled={!valid} loading={activate.isPending && !pendingForce}>
          {t('activate.action')}
        </Button>
      </form>

      {pendingForce ? (
        <div className="mt-5 rounded-xl border border-caution/25 bg-caution/10 p-4">
          <p className="font-medium text-caution">{t('activate.forceTitle')}</p>
          <p className="mt-1 text-sm text-fg-muted">{t('activate.forceBody')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button loading={activate.isPending} onClick={() => void submit(pendingForce, true)}>
              {t('activate.forceConfirm')}
            </Button>
            <Button
              variant="secondary"
              disabled={activate.isPending}
              onClick={() => setPendingForce(null)}
            >
              {t('activate.forceCancel')}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function VipPanel({ info }: { info: LicenseInfo }) {
  const { t } = useTranslation('dashboard')
  const { t: te } = useTranslation(['errors'])
  const format = useFormatters()
  const resetDevice = useResetDevice()
  const [confirmDeviceId, setConfirmDeviceId] = useState<number | null>(null)
  const { license, devices, transaction } = info
  const active = license.status === 'ACTIVE'

  let remaining = '—'
  if (license.expires_at) {
    const ms = millisecondsUntil(license.expires_at)
    if (ms <= 0) {
      remaining = t('vip.expired')
    } else {
      const hours = Math.ceil(ms / (60 * 60 * 1000))
      remaining =
        hours < 48
          ? t('vip.remainingHours', { count: hours })
          : t('vip.remainingDays', { count: Math.ceil(ms / (24 * 60 * 60 * 1000)) })
    }
  }

  const onReset = async (deviceId: number) => {
    try {
      await resetDevice.mutateAsync(deviceId)
      toast.success(t('vip.resetSuccess'))
      setConfirmDeviceId(null)
    } catch (error) {
      toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('errors:unexpected') }))
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-500/10 text-accent-300">
            <Crown aria-hidden className="size-5" />
          </span>
          <h2 className="text-lg font-semibold tracking-tight">{t('vip.title')}</h2>
        </div>
        <Badge tone={statusTone(license.status)}>{t(`status.${license.status}`)}</Badge>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-fg-subtle">{t('vip.duration')}</dt>
          <dd className="mt-1 font-medium">
            {license.duration_days != null ? t('vip.days', { count: license.duration_days }) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-fg-subtle">{t('vip.remaining')}</dt>
          <dd className="mt-1 font-medium">{remaining}</dd>
        </div>
        <div>
          <dt className="text-sm text-fg-subtle">{t('vip.activated')}</dt>
          <dd className="mt-1 font-medium">
            {license.activated_at ? format.dateTime(license.activated_at) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-fg-subtle">{t('vip.expires')}</dt>
          <dd className="mt-1 font-medium">
            {license.expires_at ? format.dateTime(license.expires_at) : '—'}
          </dd>
        </div>
      </dl>

      {transaction ? (
        <div className="mt-6 border-t border-white/5 pt-5">
          <p className="text-sm font-medium text-fg-muted">{t('vip.payment')}</p>
          <dl className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-fg-subtle">{t('vip.amount')}</dt>
              <dd className="tabular mt-1 font-medium">${format.number(transaction.amount)}</dd>
            </div>
            <div>
              <dt className="text-sm text-fg-subtle">{t('vip.method')}</dt>
              <dd className="mt-1 font-medium">{transaction.method}</dd>
            </div>
            <div>
              <dt className="text-sm text-fg-subtle">{t('vip.purchased')}</dt>
              <dd className="mt-1 font-medium">{format.dateTime(transaction.purchased_at)}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="mt-6 border-t border-white/5 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-fg-muted">{t('vip.devices')}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-fg-subtle">
            <span className="tabular">
              {t('vip.devicesCount', { used: devices.length, max: license.max_devices })}
            </span>
            <span className="tabular">{t('vip.resetsLimit', { count: license.reset_limit })}</span>
          </div>
        </div>
        {devices.length === 0 ? (
          <p className="mt-3 text-sm text-fg-subtle">{t('vip.noDevices')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {devices.map((device) => {
              const confirming = confirmDeviceId === device.id
              const busy = resetDevice.isPending && resetDevice.variables === device.id

              return (
                <li
                  key={device.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-ink-800 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="tabular font-mono text-fg-muted">{device.hwid}</p>
                    <p className="mt-0.5 text-xs text-fg-subtle">
                      {device.last_used_at ? format.dateTime(device.last_used_at) : device.ip}
                    </p>
                  </div>

                  {confirming ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-fg-muted">{t('vip.resetConfirm')}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        loading={busy}
                        onClick={() => void onReset(device.id)}
                      >
                        {t('vip.resetConfirmAction')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setConfirmDeviceId(null)}
                      >
                        {t('vip.resetCancel')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      disabled={resetDevice.isPending}
                      onClick={() => setConfirmDeviceId(device.id)}
                    >
                      <Trash2 aria-hidden className="size-3.5" />
                      {t('vip.resetDevice')}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {!active ? (
        <div className="mt-6">
          <Link to="/vip" className={buttonStyles({ variant: 'secondary' })}>
            {t('vip.goVip')}
          </Link>
        </div>
      ) : null}
    </Card>
  )
}

function PremiumDownload() {
  const { t } = useTranslation('dashboard')
  const { t: te } = useTranslation(['errors'])
  const download = usePremiumDownload()

  const onClick = async () => {
    try {
      const result = await download.mutateAsync()
      // The URL is single-use: hand it to the browser immediately and do not
      // prefetch, retry, or open it twice.
      triggerFileDownload(result.download_url)
      toast.success(t('download.success'), { description: t('download.started') })
    } catch (error) {
      toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('errors:unexpected') }))
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-accent-500/10 text-accent-300">
          <Download aria-hidden className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('download.title')}</h2>
          <p className="text-sm text-fg-muted">{t('download.subtitle')}</p>
        </div>
      </div>

      <Button className="mt-6" loading={download.isPending} onClick={() => void onClick()}>
        <Download aria-hidden className="size-4" />
        {t('download.action')}
      </Button>
    </Card>
  )
}

function LicenseSection() {
  const { t } = useTranslation('dashboard')
  const { data, isPending, isError } = useLicenseInfo(true)

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Card className="p-6">
        <p className="font-medium">{t('vip.inactive')}</p>
        <p className="mt-2 text-sm text-fg-muted">{t('vip.inactiveHint')}</p>
        <Link to="/vip" className={buttonStyles({ variant: 'secondary', className: 'mt-5' })}>
          {t('vip.goVip')}
        </Link>
      </Card>
    )
  }

  const active = data.license.status === 'ACTIVE'

  return (
    <div className="space-y-4">
      <VipPanel info={data} />
      {active ? <PremiumDownload /> : null}
    </div>
  )
}

export function DashboardPage() {
  const { t } = useTranslation('dashboard')
  const status = useAuthStore((state) => state.status)

  if (status === 'initialising') {
    return (
      <div className="shell py-16">
        <Loader2 aria-hidden className="size-6 animate-spin text-fg-subtle" />
      </div>
    )
  }

  return (
    <div className="shell space-y-8 py-16">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-3 text-fg-muted">{t('subtitle')}</p>
      </div>

      <ActivateForm />
      <LicenseSection />
    </div>
  )
}
