import { Crown, Download, Eye, EyeOff, KeyRound, Link2, Loader2, LogIn, Monitor, Plus, Trash2, TriangleAlert, Unlink, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { AuthPopupBlockedDialog } from '@/features/auth/AuthPopupBlockedDialog'
import { useAuthStore } from '@/features/auth/authStore'
import { useOAuthSignIn } from '@/features/auth/useOAuthSignIn'
import { useActivateKey, useLicenseHistory, useLicenseInfo, usePremiumDownload, useResetDevice } from '@/features/license/useLicense'
import { useRelease } from '@/features/release/useRelease'
import { ApiError, apiErrorTranslationKey, isNoActiveLicense, isServiceUnavailable } from '@/shared/api'
import {
  LICENSE_KEY_LENGTH,
  LICENSE_KEY_PATTERN,
  type LicenseDevice,
  type LicenseInfo,
} from '@/shared/api/license'
import { unlinkSocialAccount, type OAuthProvider, type User } from '@/shared/api/user'
import { DISCORD_SERVER_URL, TELEGRAM_VIP_CHAT_URL } from '@/shared/config/product'
import { cn } from '@/shared/lib/cn'
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

      {!(isPast && devices.length === 0) ? (
      <div className="border-t border-white/5 px-6 py-5 sm:px-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <p className="text-sm font-medium">{t('vip.devices')}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular text-fg-subtle">
            <span>{t('vip.devicesCount', { used: devices.length, max: license.max_devices })}</span>
            {!isPast && license.reset_limit > 0 ? (
              <span>{t('vip.resetsCount', { count: license.reset_limit })}</span>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          {(isPast ? devices : slots).map((device, index) => (
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
      ) : null}
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

function LicenseHistory() {
  const { data, isPending } = useLicenseHistory(true)

  if (isPending) return <Skeleton className="h-36" />

  return <PastSubscriptions items={data ?? []} />
}

function VipColumn() {
  const { t } = useTranslation(['dashboard', 'common'])
  const { data, isPending, isError, error, refetch, isFetching } = useLicenseInfo(true)

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56" />
        <Skeleton className="h-36" />
        <LicenseHistory />
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
        <LicenseHistory />
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
        <LicenseHistory />
      </div>
    )
  }

  const active = data.license.status === 'ACTIVE'

  return (
    <div className="space-y-4">
      <SubscriptionCard info={data} variant={active ? 'active' : 'past'} />
      <ActivateForm />
      <LicenseHistory />
    </div>
  )
}

function SocialStatus({
  label,
  value,
  icon: Icon,
  color,
  linking,
  unlinking,
  canUnlink,
  disabled,
  onLink,
  onUnlink,
}: {
  label: string
  value: string | null
  icon: typeof TelegramIcon
  color: string
  linking: boolean
  unlinking: boolean
  canUnlink: boolean
  disabled?: boolean
  onLink: () => void
  onUnlink: () => void
}) {
  const { t } = useTranslation('dashboard')
  const linked = Boolean(value)

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-ink-800/70 px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className={`size-5 ${color}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="truncate text-xs text-fg-subtle">{value ?? t('account.notLinked')}</p>
        </div>
      </div>
      {linked ? (
        canUnlink ? (
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0"
            loading={unlinking}
            disabled={disabled}
            onClick={onUnlink}
          >
            <Unlink aria-hidden className="size-3.5" />
            {t('account.unlinkAction')}
          </Button>
        ) : (
          <Badge tone="positive">{t('account.linked')}</Badge>
        )
      ) : (
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0"
          loading={linking}
          disabled={disabled}
          onClick={onLink}
        >
          <Link2 aria-hidden className="size-3.5" />
          {t('account.linkAction')}
        </Button>
      )}
    </div>
  )
}

function CommunityInvite({
  title,
  text,
  hint,
  href,
  action,
  enabled,
  icon: Icon,
  color,
}: {
  title: string
  text: string
  hint?: string
  href: string
  action: string
  enabled: boolean
  icon: typeof TelegramIcon
  color: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl bg-ink-800/70 px-4 py-3.5',
        !enabled && 'text-fg-subtle',
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon className={cn('mt-0.5 size-5 shrink-0', enabled ? color : 'text-fg-subtle')} />
        <div className="min-w-0">
          <p className={cn('text-sm font-medium', !enabled && 'text-fg-subtle')}>{title}</p>
          <p className={cn('mt-0.5 text-xs', enabled ? 'text-fg-muted' : 'text-fg-subtle')}>{text}</p>
          {hint ? <p className="mt-1 text-xs text-fg-subtle">{hint}</p> : null}
        </div>
      </div>
      {enabled ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className={buttonStyles({ size: 'sm', variant: 'secondary', className: 'shrink-0' })}
        >
          <LogIn aria-hidden className="size-3.5" />
          {action}
        </a>
      ) : (
        <Button size="sm" variant="secondary" disabled className="shrink-0">
          <LogIn aria-hidden className="size-3.5" />
          {action}
        </Button>
      )}
    </div>
  )
}

function AccountPanel({ user }: { user: User }) {
  const { t } = useTranslation('dashboard')
  const { t: te } = useTranslation(['errors'])
  const format = useFormatters()
  const setUser = useAuthStore((state) => state.setUser)
  const {
    pendingProvider,
    blockedProvider,
    link,
    retryAfterAllowingPopups,
    dismissPopupBlock,
  } = useOAuthSignIn()
  const [unlinkingProvider, setUnlinkingProvider] = useState<OAuthProvider | null>(null)
  const telegramLinked = Boolean(user.telegram_id)
  const discordLinked = Boolean(user.discord_id)
  const canUnlink = telegramLinked && discordLinked
  const busy = pendingProvider !== null || unlinkingProvider !== null

  const onLink = async (provider: OAuthProvider) => {
    const ok = await link(provider)
    if (ok) toast.success(t('account.linkSuccess'))
  }

  const onUnlink = async (provider: OAuthProvider) => {
    setUnlinkingProvider(provider)
    try {
      const next = await unlinkSocialAccount(provider)
      setUser(next)
      toast.success(t('account.unlinkSuccess'))
    } catch (error) {
      toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('errors:unexpected') }))
    } finally {
      setUnlinkingProvider(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Avatar src={user.avatar_url} name={user.nickname} className="size-20 text-xl" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">{user.nickname}</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            {t('account.roleWithId', { role: t(`account.roles.${user.role}`), id: user.id })}
          </p>
          {user.created_at ? (
            <p className="mt-0.5 text-sm text-fg-subtle">
              {t('account.registered', { date: format.dateOnly(user.created_at) })}
            </p>
          ) : null}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="space-y-3">
            <SocialStatus
              label={t('account.telegram')}
              value={user.telegram_id}
              icon={TelegramIcon}
              color="text-[#2AABEE]"
              linking={pendingProvider === 'telegram'}
              unlinking={unlinkingProvider === 'telegram'}
              canUnlink={canUnlink}
              disabled={busy && pendingProvider !== 'telegram' && unlinkingProvider !== 'telegram'}
              onLink={() => void onLink('telegram')}
              onUnlink={() => void onUnlink('telegram')}
            />
            <CommunityInvite
              title={t('account.telegramChatTitle')}
              text={t('account.telegramChatText')}
              hint={telegramLinked ? undefined : t('account.telegramChatLocked')}
              href={TELEGRAM_VIP_CHAT_URL}
              action={t('account.telegramChatAction')}
              enabled={telegramLinked}
              icon={TelegramIcon}
              color="text-[#2AABEE]"
            />
          </div>
          <div className="space-y-3">
            <SocialStatus
              label={t('account.discord')}
              value={user.discord_id}
              icon={DiscordIcon}
              color="text-[#5865F2]"
              linking={pendingProvider === 'discord'}
              unlinking={unlinkingProvider === 'discord'}
              canUnlink={canUnlink}
              disabled={busy && pendingProvider !== 'discord' && unlinkingProvider !== 'discord'}
              onLink={() => void onLink('discord')}
              onUnlink={() => void onUnlink('discord')}
            />
            <CommunityInvite
              title={t('account.discordServerTitle')}
              text={t('account.discordServerText')}
              href={DISCORD_SERVER_URL}
              action={t('account.discordServerAction')}
              enabled
              icon={DiscordIcon}
              color="text-[#5865F2]"
            />
          </div>
        </div>
      </Card>

      {blockedProvider ? (
        <AuthPopupBlockedDialog
          onRetry={() => void retryAfterAllowingPopups()}
          onDismiss={dismissPopupBlock}
        />
      ) : null}
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
