import { Crown, Download, Eye, EyeOff, KeyRound, Loader2, Monitor, Plus, Trash2, TriangleAlert, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { useAuthStore } from '@/features/auth/authStore'
import { useActivateKey, useLicenseInfo, usePremiumDownload, useResetDevice } from '@/features/license/useLicense'
import { useRelease } from '@/features/release/useRelease'
import { ApiError, apiErrorTranslationKey, isNoActiveLicense, isServiceUnavailable } from '@/shared/api'
import {
  LICENSE_KEY_LENGTH,
  LICENSE_KEY_PATTERN,
  type LicenseDevice,
  type LicenseInfo,
} from '@/shared/api/license'
import { deleteMyAccount, type User } from '@/shared/api/user'
import { millisecondsUntil, remainingTickMs, remainingTimeParts } from '@/shared/lib/datetime'
import { triggerFileDownload } from '@/shared/lib/download'
import { useFormatters } from '@/shared/lib/format'
import {
  Avatar,
  Badge,
  Button,
  buttonStyles,
  Card,
  DiscordIcon,
  SegmentedControl,
  Skeleton,
  TelegramIcon,
} from '@/shared/ui'

type DashboardTab = 'vip' | 'account'

/** Formats the raw input into the backend's `XXXX-XXXX-XXXX-XXXX` shape. */
function formatLicenseKey(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)
  const parts = cleaned.match(/.{1,4}/g)
  return parts ? parts.join('-') : ''
}

function headlineKey(
  status: LicenseInfo['license']['status'],
  past: boolean,
): 'vip.headlinePast' | 'vip.headlineActive' | 'vip.headlineBanned' | 'vip.headlineExpired' {
  if (past) return 'vip.headlinePast'
  if (status === 'ACTIVE') return 'vip.headlineActive'
  if (status === 'BANNED') return 'vip.headlineBanned'
  return 'vip.headlineExpired'
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
    <Card className="p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-accent-500/10 text-accent-300">
          <KeyRound aria-hidden className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('activate.title')}</h2>
          <p className="mt-0.5 text-sm text-fg-muted">{t('activate.subtitle')}</p>
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

function DeviceSlot({
  device,
  index,
  canReset,
  confirming,
  busy,
  onAskReset,
  onConfirmReset,
  onCancelReset,
}: {
  device: LicenseDevice | null
  index: number
  canReset: boolean
  confirming: boolean
  busy: boolean
  onAskReset: () => void
  onConfirmReset: () => void
  onCancelReset: () => void
}) {
  const { t } = useTranslation('dashboard')
  const format = useFormatters()

  if (!device) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/12 px-4 py-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink-800 text-fg-subtle">
          <Plus aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{t('vip.slotFreeTitle')}</p>
          <p className="mt-0.5 text-sm text-fg-subtle">{t('vip.slotFreeHint')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-ink-800/70 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-500/10 text-accent-300">
          <Monitor aria-hidden className="size-4" />
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium">{t('vip.slotOccupied', { index })}</p>
        {canReset ? (
          confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-fg-muted">{t('vip.resetConfirm')}</span>
              <Button type="button" size="sm" variant="primary" loading={busy} onClick={onConfirmReset}>
                {t('vip.resetConfirmAction')}
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancelReset}>
                {t('vip.resetCancel')}
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={onAskReset}>
              <Trash2 aria-hidden className="size-3.5" />
              {t('vip.resetDevice')}
            </Button>
          )
        ) : null}
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <dt className="text-fg-subtle">{t('vip.hwid')}</dt>
          <dd className="tabular font-mono text-fg-muted">{device.hwid}</dd>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <dt className="text-fg-subtle">{t('vip.ip')}</dt>
          <dd className="tabular text-fg-muted">{device.ip}</dd>
        </div>
        {device.first_used_at ? (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className="text-fg-subtle">{t('vip.firstUsed')}</dt>
            <dd className="text-fg-muted">{format.dateTimeLong(device.first_used_at)}</dd>
          </div>
        ) : null}
        {device.last_used_at ? (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className="text-fg-subtle">{t('vip.lastUsed')}</dt>
            <dd className="text-fg-muted">{format.dateTimeLong(device.last_used_at)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

function maskLicenseKey(key: string): string {
  return key.replace(/[A-Za-z0-9]/g, '*')
}

function LicenseKeyReveal({ value }: { value: string }) {
  const { t } = useTranslation('dashboard')
  const [visible, setVisible] = useState(false)

  return (
    <div
      aria-label={t('vip.key')}
      className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-accent-500/20 bg-accent-500/10 px-3"
    >
      <KeyRound aria-hidden className="size-4 shrink-0 text-accent-300" />
      <span className="tabular font-mono text-sm tracking-wider text-fg">
        {visible ? value : maskLicenseKey(value)}
      </span>
      <button
        type="button"
        aria-label={visible ? t('vip.hideKey') : t('vip.showKey')}
        aria-pressed={visible}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-accent-500/15 hover:text-fg"
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
      </button>
    </div>
  )
}

function PremiumDownloadButton() {
  const { t } = useTranslation('dashboard')
  const { t: te } = useTranslation(['errors'])
  const download = usePremiumDownload()
  const { data: release } = useRelease()
  const vipLabel = release?.vip?.rawVersion ?? release?.vip?.version
  const actionLabel = vipLabel
    ? t('download.actionVersion', { version: vipLabel })
    : t('download.action')

  const onClick = async () => {
    try {
      const result = await download.mutateAsync()
      triggerFileDownload(result.download_url)
      toast.success(t('download.success'), { description: t('download.started') })
    } catch (error) {
      toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('errors:unexpected') }))
    }
  }

  return (
    <div className="flex w-full flex-col items-center sm:w-auto">
      <Button size="lg" loading={download.isPending} onClick={() => void onClick()}>
        <Download aria-hidden className="size-4" />
        {actionLabel}
      </Button>
      <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-fg-subtle">
        <TriangleAlert aria-hidden className="size-3.5 shrink-0 text-caution" />
        {t('download.subtitle')}
      </p>
    </div>
  )
}

function SubscriptionCard({
  info,
  variant = 'active',
}: {
  info: LicenseInfo
  variant?: 'active' | 'past'
}) {
  const { t } = useTranslation(['dashboard', 'common'])
  const { t: te } = useTranslation(['errors'])
  const format = useFormatters()
  const resetDevice = useResetDevice()
  const [confirmDeviceId, setConfirmDeviceId] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const { license, devices, transaction } = info
  const isPast = variant === 'past'
  const remainingMs = license.expires_at ? millisecondsUntil(license.expires_at, now) : 0
  const tickMs = !isPast && license.status === 'ACTIVE' ? remainingTickMs(remainingMs) : null

  useEffect(() => {
    if (tickMs == null) return
    const id = window.setInterval(() => setNow(Date.now()), tickMs)
    return () => window.clearInterval(id)
  }, [tickMs, license.expires_at])

  const remainingParts = remainingTimeParts(remainingMs)
  const remainingLabel = remainingParts
    ? t(`common:units.${remainingParts.unit}`, { count: remainingParts.count })
    : null

  const slots: Array<LicenseDevice | null> = Array.from(
    { length: Math.max(license.max_devices, devices.length) },
    (_, index) => devices[index] ?? null,
  )

  const canReset = !isPast && license.reset_limit > 0
  const showDownload = !isPast && license.status === 'ACTIVE'

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
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-wide text-accent-300">
            {t(headlineKey(license.status, isPast))}
          </p>
          {remainingLabel && !isPast ? (
            <>
              <p className="mt-5 text-sm text-fg-subtle">{t('vip.remaining')}</p>
              <p className="tabular mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
                {remainingLabel}
              </p>
            </>
          ) : license.expires_at ? (
            <p className="tabular mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              {format.dateTimeLong(license.expires_at)}
            </p>
          ) : null}
          <div className="mt-5 space-y-1.5 text-sm">
            {transaction ? (
              <p className="text-fg-muted">
                {t('vip.paid', { amount: format.number(transaction.amount), method: transaction.method })}
              </p>
            ) : null}
            <dl className="space-y-1.5">
              {license.activated_at ? (
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-fg-subtle">{t('vip.activated')}</dt>
                  <dd className="text-fg-muted">{format.dateTimeLong(license.activated_at)}</dd>
                </div>
              ) : null}
              {license.expires_at && remainingLabel && !isPast ? (
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-fg-subtle">{t('vip.until')}</dt>
                  <dd className="text-fg-muted">{format.dateTimeLong(license.expires_at)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-6 lg:items-end">
          {license.key ? <LicenseKeyReveal value={license.key} /> : null}
          {showDownload ? <PremiumDownloadButton /> : null}
        </div>
      </div>

      <div className="border-t border-white/5 px-6 py-5 sm:px-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <p className="text-sm font-medium">{t('vip.devices')}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular text-fg-subtle">
            <span>{t('vip.devicesCount', { used: devices.length, max: license.max_devices })}</span>
            {license.reset_limit > 0 ? (
              <span>{t('vip.resetsCount', { count: license.reset_limit })}</span>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          {slots.map((device, index) => (
            <DeviceSlot
              key={device?.id ?? `empty-${index}`}
              device={device}
              index={index + 1}
              canReset={canReset && device != null}
              confirming={device != null && confirmDeviceId === device.id}
              busy={device != null && resetDevice.isPending && resetDevice.variables === device.id}
              onAskReset={() => {
                if (device) setConfirmDeviceId(device.id)
              }}
              onConfirmReset={() => {
                if (device) void onReset(device.id)
              }}
              onCancelReset={() => setConfirmDeviceId(null)}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}

function PastSubscriptions({ items }: { items: LicenseInfo[] }) {
  const { t } = useTranslation('dashboard')
  if (items.length === 0) return null

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-medium text-fg-muted">{t('past.title')}</h3>
      {items.map((info) => (
        <SubscriptionCard key={info.license.id} info={info} variant="past" />
      ))}
    </section>
  )
}

function VipColumn() {
  const { t } = useTranslation(['dashboard', 'common'])
  const { data, isPending, isError, error, refetch, isFetching } = useLicenseInfo(true)
  const pastSubscriptions: LicenseInfo[] = []

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56" />
        <Skeleton className="h-36" />
      </div>
    )
  }

  if (isError && (isServiceUnavailable(error) || (!isNoActiveLicense(error) && !(error instanceof ApiError && error.status === 404)))) {
    return (
      <div className="space-y-4">
        <Card className="px-6 py-10 text-center sm:px-10">
          <p className="text-lg font-semibold tracking-tight">{t('vip.unavailable')}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">{t('vip.unavailableHint')}</p>
          <Button className="mt-6" variant="secondary" loading={isFetching} onClick={() => void refetch()}>
            {t('common:actions.retry')}
          </Button>
        </Card>
        <ActivateForm />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Card className="px-6 py-12 text-center sm:px-10">
          <Crown aria-hidden className="mx-auto size-8 text-accent-300" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">{t('vip.inactive')}</h2>
          <p className="mx-auto mt-2 max-w-md text-fg-muted">{t('vip.inactiveHint')}</p>
          <Link to="/vip" className={buttonStyles({ size: 'lg', className: 'mt-6' })}>
            {t('vip.goVip')}
          </Link>
        </Card>
        <ActivateForm />
      </div>
    )
  }

  const active = data.license.status === 'ACTIVE'

  return (
    <div className="space-y-4">
      <SubscriptionCard info={data} variant={active ? 'active' : 'past'} />
      <ActivateForm />
      <PastSubscriptions items={pastSubscriptions} />
    </div>
  )
}

function AccountPanel({ user }: { user: User }) {
  const { t } = useTranslation('dashboard')
  const { t: te } = useTranslation(['errors'])
  const format = useFormatters()
  const navigate = useNavigate()
  const signOut = useAuthStore((state) => state.signOut)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const onDelete = async () => {
    setDeleting(true)
    try {
      await deleteMyAccount()
      toast.success(t('account.deleteSuccess'))
      signOut()
      void navigate('/', { replace: true })
    } catch (error) {
      toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('errors:unexpected') }))
    } finally {
      setDeleting(false)
    }
  }

  const socials = [
    {
      id: 'telegram',
      label: t('account.telegram'),
      value: user.telegram_id,
      icon: TelegramIcon,
      color: 'text-[#2AABEE]',
    },
    {
      id: 'discord',
      label: t('account.discord'),
      value: user.discord_id,
      icon: DiscordIcon,
      color: 'text-[#5865F2]',
    },
  ] as const

  return (
    <div className="space-y-4">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Avatar src={user.avatar_url} name={user.nickname} className="size-20 text-xl" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">{user.nickname}</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            {t(`account.roles.${user.role}`)}
            {user.created_at ? ` · ${t('account.memberSince', { date: format.dateTimeLong(user.created_at) })}` : null}
          </p>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {socials.map((social) => {
            const Icon = social.icon
            const linked = Boolean(social.value)
            return (
              <li key={social.id} className="flex items-center justify-between gap-3 rounded-xl bg-ink-800/70 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className={`size-5 ${social.color}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{social.label}</p>
                    <p className="truncate text-xs text-fg-subtle">
                      {social.value ?? t('account.notLinked')}
                    </p>
                  </div>
                </div>
                <Badge tone={linked ? 'positive' : 'neutral'}>
                  {linked ? t('account.linked') : t('account.notLinked')}
                </Badge>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card className="p-6 sm:p-8">
        <p className="text-sm text-fg-muted">{t('account.deleteHint')}</p>
        {confirmDelete ? (
          <div className="mt-5 rounded-xl border border-negative/25 bg-negative/10 p-4">
            <p className="text-sm text-fg-muted">{t('account.deleteConfirm')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" loading={deleting} onClick={() => void onDelete()}>
                {t('account.deleteConfirmAction')}
              </Button>
              <Button variant="secondary" disabled={deleting} onClick={() => setConfirmDelete(false)}>
                {t('account.deleteCancel')}
              </Button>
            </div>
          </div>
        ) : (
          <Button className="mt-5" variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden className="size-4" />
            {t('account.deleteAction')}
          </Button>
        )}
      </Card>
    </div>
  )
}

export function DashboardPage() {
  const { t } = useTranslation('dashboard')
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const [tab, setTab] = useState<DashboardTab>('vip')

  if (status === 'initialising' || !user) {
    return (
      <div className="shell py-16">
        <Loader2 aria-hidden className="size-6 animate-spin text-fg-subtle" />
      </div>
    )
  }

  return (
    <div className="shell space-y-10 py-16">
      <section className="text-center">
        <h1 className="text-gradient text-4xl font-semibold tracking-tight sm:text-5xl">{t('title')}</h1>
        <p className="mx-auto mt-4 max-w-xl text-fg-muted">{t('subtitle')}</p>
      </section>

      <SegmentedControl
        fullWidth
        label={t('title')}
        value={tab}
        onChange={setTab}
        className="p-1.5"
        options={[
          { id: 'vip', label: t('sections.vip'), icon: Crown },
          { id: 'account', label: t('sections.account'), icon: UserRound },
        ]}
      />

      {tab === 'vip' ? <VipColumn /> : <AccountPanel user={user} />}
    </div>
  )
}
