import { Copy, Search, Trash2, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  useAdminLicenseSearch,
  useDeleteAdminDevice,
  useDeleteAdminLicense,
  useGenerateLicense,
  useGenerateLicensesBulk,
  useUpdateAdminLicense,
  type AdminLicenseLookup,
} from '@/features/admin/useAdmin'
import { useTariffs } from '@/features/license/useTariffs'
import { apiErrorTranslationKey } from '@/shared/api'
import type { AdminLicense } from '@/shared/api/admin'
import {
  LICENSE_KEY_LENGTH,
  LICENSE_KEY_PATTERN,
  type LicenseStatus,
  type PaymentMethod,
  type TariffPlan,
} from '@/shared/api/license'
import { copyText } from '@/shared/lib/clipboard'
import { useFormatters } from '@/shared/lib/format'
import { Badge, Button, Card, SegmentedControl, Skeleton } from '@/shared/ui'

const METHODS: PaymentMethod[] = ['FunPay', 'Stars', 'Card', 'Crypto', 'PayPal', 'Steam', 'Gift', 'Promo']
const STATUSES: LicenseStatus[] = ['NOT_ACTIVATED', 'ACTIVE', 'EXPIRED', 'BANNED']

const inputClass =
  'rounded-xl border border-white/8 bg-ink-800 px-4 py-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent-500/40'

function formatLicenseKey(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)
  const parts = cleaned.match(/.{1,4}/g)
  return parts ? parts.join('-') : ''
}

function statusTone(status: LicenseStatus): 'positive' | 'caution' | 'negative' | 'neutral' {
  if (status === 'ACTIVE') return 'positive'
  if (status === 'EXPIRED') return 'caution'
  if (status === 'BANNED') return 'negative'
  return 'neutral'
}

export function LicensesPanel({
  initialUserId,
  onConsumedInitialUserId,
  onOpenUser,
}: {
  initialUserId: number | null
  onConsumedInitialUserId: () => void
  onOpenUser: (userId: number) => void
}) {
  const { t } = useTranslation(['admin', 'common'])
  const { t: te } = useTranslation('errors')
  const [mode, setMode] = useState<'key' | 'user' | 'id'>('key')
  const [keyDraft, setKeyDraft] = useState('')
  const [userDraft, setUserDraft] = useState('')
  const [idDraft, setIdDraft] = useState('')
  const [query, setQuery] = useState<AdminLicenseLookup | null>(null)
  const licenses = useAdminLicenseSearch(query)

  useEffect(() => {
    if (initialUserId == null) return
    setMode('user')
    setUserDraft(String(initialUserId))
    setQuery({ user_id: initialUserId })
    onConsumedInitialUserId()
  }, [initialUserId, onConsumedInitialUserId])

  const onSearch = (event: FormEvent) => {
    event.preventDefault()
    if (mode === 'key') {
      if (!LICENSE_KEY_PATTERN.test(keyDraft)) return
      setQuery({ key: keyDraft })
      return
    }
    if (mode === 'id') {
      const licenseId = Number(idDraft)
      if (!Number.isInteger(licenseId) || licenseId <= 0) return
      setQuery({ license_id: licenseId })
      return
    }
    const userId = Number(userDraft)
    if (!Number.isInteger(userId) || userId <= 0) return
    setQuery({ user_id: userId })
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">{t('tabs.licenses')}</h2>
        <SegmentedControl
          className="mt-5"
          fullWidth
          label={t('licenses.searchLabel')}
          value={mode}
          onChange={setMode}
          options={[
            { id: 'key', label: t('licenses.byKey') },
            { id: 'id', label: t('licenses.byId') },
            { id: 'user', label: t('licenses.byUser') },
          ]}
        />
        <form onSubmit={onSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
          {mode === 'key' ? (
            <input
              value={keyDraft}
              onChange={(event) => setKeyDraft(formatLicenseKey(event.target.value))}
              placeholder={t('licenses.placeholderKey')}
              maxLength={LICENSE_KEY_LENGTH}
              spellCheck={false}
              className={`${inputClass} tabular min-w-0 w-full flex-1 tracking-wider`}
            />
          ) : mode === 'id' ? (
            <input
              value={idDraft}
              onChange={(event) => setIdDraft(event.target.value.replace(/\D/g, ''))}
              placeholder={t('licenses.placeholderId')}
              inputMode="numeric"
              className={`${inputClass} tabular min-w-0 w-full flex-1`}
            />
          ) : (
            <input
              value={userDraft}
              onChange={(event) => setUserDraft(event.target.value.replace(/\D/g, ''))}
              placeholder={t('licenses.placeholderUser')}
              inputMode="numeric"
              className={`${inputClass} tabular min-w-0 w-full flex-1`}
            />
          )}
          <Button
            type="submit"
            loading={licenses.isFetching}
            disabled={
              mode === 'key'
                ? !LICENSE_KEY_PATTERN.test(keyDraft)
                : mode === 'id'
                  ? !idDraft
                  : !userDraft
            }
          >
            <Search aria-hidden className="size-4" />
            {t('licenses.action')}
          </Button>
        </form>
        <p className="mt-4 text-sm text-fg-muted">{t('licenses.hint')}</p>
      </Card>

      {!query ? null : licenses.isPending ? (
        <Skeleton className="h-48" />
      ) : licenses.isError ? (
        <Card className="p-6">
          <p className="text-sm text-fg-muted">{te('unexpected')}</p>
        </Card>
      ) : licenses.data.length === 0 ? (
        <Card className="p-6">
          <p className="font-medium">{t('licenses.empty')}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {licenses.data.map((license) => (
            <LicenseCard
              key={license.id}
              license={license}
              onOpenUser={onOpenUser}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function applyTariffDefaults(
  plan: TariffPlan,
  setters: {
    setDuration: (value: string) => void
    setAmount: (value: string) => void
    setMaxDevices: (value: string) => void
    setResetLimit: (value: string) => void
  },
) {
  setters.setDuration(String(plan.duration_days))
  setters.setAmount(String(plan.price))
  setters.setMaxDevices(String(plan.max_devices))
  setters.setResetLimit(String(plan.reset_limit))
}

export function GenerateCard() {
  const { t } = useTranslation(['admin', 'vip', 'common'])
  const { t: te } = useTranslation('errors')
  const { data: tariffs } = useTariffs()
  const generateOne = useGenerateLicense()
  const generateBulk = useGenerateLicensesBulk()
  const tariffPlans = tariffs?.plans
  const plans = tariffPlans ?? []
  const [duration, setDuration] = useState('30')
  const [amount, setAmount] = useState('3')
  const [method, setMethod] = useState<PaymentMethod>('FunPay')
  const [maxDevices, setMaxDevices] = useState('2')
  const [resetLimit, setResetLimit] = useState('0')
  const [count, setCount] = useState('1')
  const [created, setCreated] = useState<string[]>([])
  const [defaultsApplied, setDefaultsApplied] = useState(false)

  useEffect(() => {
    if (defaultsApplied || !tariffPlans?.length) return
    const preferred = tariffPlans.find((plan) => plan.duration_days === 30) ?? tariffPlans[0]
    if (!preferred) return
    applyTariffDefaults(preferred, { setDuration, setAmount, setMaxDevices, setResetLimit })
    setDefaultsApplied(true)
  }, [defaultsApplied, tariffPlans])

  const busy = generateOne.isPending || generateBulk.isPending
  const days = Number(duration)
  const qty = Number(count)
  const valid =
    days > 0 &&
    qty >= 1 &&
    qty <= 100 &&
    Number(amount) >= 0 &&
    Number(maxDevices) >= 1 &&
    Number(resetLimit) >= 0

  const onGenerate = async () => {
    if (!valid) return
    const payload = {
      duration_days: days,
      amount: Number(amount),
      method,
      max_devices: Number(maxDevices),
      reset_limit: Number(resetLimit),
      status: 'COMPLETED' as const,
    }
    try {
      if (qty === 1) {
        const result = await generateOne.mutateAsync(payload)
        setCreated([result.key])
        toast.success(t('generate.successOne'))
      } else {
        const keys = await generateBulk.mutateAsync({ ...payload, count: qty })
        setCreated(keys)
        toast.success(t('generate.successMany', { count: keys.length }))
      }
    } catch (error) {
      toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('unexpected') }))
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">{t('generate.title')}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">
          <span className="text-fg-subtle">{t('generate.duration')}</span>
          <select
            value={duration}
            onChange={(event) => {
              const next = event.target.value
              const plan = plans.find((item) => String(item.duration_days) === next)
              if (plan) {
                applyTariffDefaults(plan, { setDuration, setAmount, setMaxDevices, setResetLimit })
                return
              }
              setDuration(next)
            }}
            className={`${inputClass} mt-1.5 w-full`}
          >
            {plans.map((plan) => (
              <option key={plan.duration_days} value={plan.duration_days}>
                {t('vip:pricing.days', { count: plan.duration_days })} · ${plan.price}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-fg-subtle">{t('generate.amount')}</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            min={0}
            step="0.01"
            className={`${inputClass} tabular mt-1.5 w-full`}
          />
        </label>
        <label className="text-sm">
          <span className="text-fg-subtle">{t('generate.method')}</span>
          <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className={`${inputClass} mt-1.5 w-full`}>
            {METHODS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-fg-subtle">{t('generate.maxDevices')}</span>
          <input
            value={maxDevices}
            onChange={(event) => setMaxDevices(event.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            className={`${inputClass} tabular mt-1.5 w-full`}
          />
        </label>
        <label className="text-sm">
          <span className="text-fg-subtle">{t('generate.resetLimit')}</span>
          <input
            value={resetLimit}
            onChange={(event) => setResetLimit(event.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            className={`${inputClass} tabular mt-1.5 w-full`}
          />
        </label>
        <label className="text-sm">
          <span className="text-fg-subtle">{t('generate.count')}</span>
          <input
            value={count}
            onChange={(event) => setCount(event.target.value.replace(/\D/g, '').slice(0, 3))}
            inputMode="numeric"
            className={`${inputClass} tabular mt-1.5 w-full`}
          />
        </label>
      </div>
      <Button className="mt-5" disabled={!valid} loading={busy} onClick={() => void onGenerate()}>
        {t('generate.action')}
      </Button>

      {created.length > 0 ? (
        <div className="mt-5 rounded-xl bg-ink-800/70 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-fg-subtle">{t('generate.successMany', { count: created.length })}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void copyText(created.join('\n')).then((ok) => {
                  if (ok) toast.success(t('licenses.copied'))
                  else toast.error(t('actions.copyFailed', { ns: 'common' }))
                })
              }}
            >
              <Copy aria-hidden className="size-3.5" />
              {t('generate.copyAll')}
            </Button>
          </div>
          <ul className="mt-2 space-y-1">
            {created.map((key) => (
              <li key={key} className="tabular font-mono text-sm tracking-wider">
                {key}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  )
}

function LicenseCard({
  license,
  onOpenUser,
}: {
  license: AdminLicense
  onOpenUser: (userId: number) => void
}) {
  const { t } = useTranslation(['admin', 'common'])
  const { t: te } = useTranslation('errors')
  const format = useFormatters()
  const updateLicense = useUpdateAdminLicense()
  const deleteLicense = useDeleteAdminLicense()
  const deleteDevice = useDeleteAdminDevice()
  const [status, setStatus] = useState(license.status)
  const [maxDevices, setMaxDevices] = useState(String(license.max_devices))
  const [resetLimit, setResetLimit] = useState(String(license.reset_limit))
  const [userId, setUserId] = useState(license.user_id != null ? String(license.user_id) : '')
  const [duration, setDuration] = useState(
    license.duration_days != null ? String(license.duration_days) : '',
  )
  const [amount, setAmount] = useState(
    license.transaction != null ? String(license.transaction.amount) : '',
  )
  const [confirmDeviceId, setConfirmDeviceId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setStatus(license.status)
    setMaxDevices(String(license.max_devices))
    setResetLimit(String(license.reset_limit))
    setUserId(license.user_id != null ? String(license.user_id) : '')
    setDuration(license.duration_days != null ? String(license.duration_days) : '')
    setAmount(license.transaction != null ? String(license.transaction.amount) : '')
  }, [license])

  const maxDevicesNum = Number(maxDevices)
  const resetLimitNum = Number(resetLimit)
  const userIdNum = userId === '' ? null : Number(userId)
  const durationNum = duration === '' ? null : Number(duration)
  const amountNum = amount === '' ? NaN : Number(amount)
  const currentAmount = license.transaction?.amount
  const dirty =
    status !== license.status ||
    maxDevicesNum !== license.max_devices ||
    resetLimitNum !== license.reset_limit ||
    userIdNum !== license.user_id ||
    durationNum !== license.duration_days ||
    (license.transaction != null && amountNum !== currentAmount)
  const canSave =
    dirty &&
    maxDevicesNum >= 1 &&
    resetLimitNum >= 0 &&
    (userIdNum === null || (Number.isInteger(userIdNum) && userIdNum > 0)) &&
    (durationNum === null || (Number.isInteger(durationNum) && durationNum > 0)) &&
    (license.transaction == null || (Number.isFinite(amountNum) && amountNum >= 0))

  const onSave = async () => {
    try {
      await updateLicense.mutateAsync({
        licenseId: license.id,
        payload: {
          status,
          max_devices: maxDevicesNum,
          reset_limit: resetLimitNum,
          user_id: userIdNum,
          duration_days: durationNum,
          ...(license.transaction != null && Number.isFinite(amountNum)
            ? { amount: amountNum }
            : {}),
        },
      })
      toast.success(t('licenses.saved'))
    } catch (error) {
      toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('unexpected') }))
    }
  }

  const onDelete = async () => {
    try {
      await deleteLicense.mutateAsync(license.id)
      toast.success(t('licenses.deleted'))
    } catch (error) {
      toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('unexpected') }))
    }
  }

  const onRemoveDevice = async (deviceId: number) => {
    try {
      await deleteDevice.mutateAsync(deviceId)
      toast.success(t('licenses.removed'))
      setConfirmDeviceId(null)
    } catch (error) {
      toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('unexpected') }))
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="tabular font-mono text-sm tracking-wider">{license.key}</p>
          <p className="mt-1 text-xs text-fg-subtle">#{license.id}</p>
          {license.user_id != null ? (
            <Button
              className="mt-2"
              size="sm"
              variant="secondary"
              onClick={() => onOpenUser(license.user_id!)}
            >
              <UserRound aria-hidden className="size-3.5" />
              {t('licenses.owner')} #{license.user_id}
            </Button>
          ) : (
            <p className="mt-2 text-sm text-fg-subtle">{t('licenses.noOwner')}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(license.status)}>{t(`licenses.statuses.${license.status}`)}</Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void copyText(license.key).then((ok) => {
                if (ok) toast.success(t('licenses.copied'))
                else toast.error(t('actions.copyFailed', { ns: 'common' }))
              })
            }}
          >
            <Copy aria-hidden className="size-3.5" />
            {t('licenses.copy')}
          </Button>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-fg-subtle">{t('licenses.activated')}</dt>
          <dd className="mt-0.5">
            {license.activated_at ? format.dateTimeWithUtc(license.activated_at) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-fg-subtle">
            {license.status === 'EXPIRED'
              ? t('licenses.ended')
              : license.status === 'BANNED'
                ? t('licenses.bannedAt')
                : t('licenses.expires')}
          </dt>
          <dd className="mt-0.5">{license.expires_at ? format.dateTimeWithUtc(license.expires_at) : '—'}</dd>
        </div>
        <div>
          <dt className="text-fg-subtle">{t('licenses.payment')}</dt>
          <dd className="mt-0.5">
            {license.transaction
              ? `$${format.money(license.transaction.amount)} · ${license.transaction.method}`
              : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <p className="text-sm font-medium">{t('licenses.edit')}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">
          <span className="text-fg-subtle">{t('licenses.status')}</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as LicenseStatus)}
            className={`${inputClass} mt-1.5 w-full`}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`licenses.statuses.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-fg-subtle">{t('licenses.userId')}</span>
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value.replace(/\D/g, ''))}
            placeholder={t('licenses.noOwner')}
            inputMode="numeric"
            className={`${inputClass} tabular mt-1.5 w-full`}
          />
        </label>
        <label className="text-sm">
          <span className="text-fg-subtle">{t('licenses.duration')}</span>
          <input
            value={duration}
            onChange={(event) => setDuration(event.target.value.replace(/\D/g, ''))}
            placeholder={t('licenses.forever')}
            inputMode="numeric"
            className={`${inputClass} tabular mt-1.5 w-full`}
          />
        </label>
        <label className="text-sm">
          <span className="text-fg-subtle">{t('licenses.amount')}</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            min={0}
            step="0.01"
            disabled={license.transaction == null}
            placeholder={license.transaction == null ? t('licenses.noTransaction') : undefined}
            className={`${inputClass} tabular mt-1.5 w-full disabled:opacity-50`}
          />
        </label>
        <label className="text-sm">
          <span className="text-fg-subtle">{t('licenses.maxDevices')}</span>
          <input
            value={maxDevices}
            onChange={(event) => setMaxDevices(event.target.value.replace(/\D/g, ''))}
            className={`${inputClass} tabular mt-1.5 w-full`}
          />
        </label>
        <label className="text-sm">
          <span className="text-fg-subtle">{t('licenses.resetLimit')}</span>
          <input
            value={resetLimit}
            onChange={(event) => setResetLimit(event.target.value.replace(/\D/g, ''))}
            className={`${inputClass} tabular mt-1.5 w-full`}
          />
        </label>
        </div>
      </div>

      <div className="mt-6 border-t border-white/5 pt-5">
        <p className="text-sm font-medium">
          {t('licenses.devices')} · {license.devices.length}/{license.max_devices}
        </p>
        {license.devices.length === 0 ? (
          <p className="mt-2 text-sm text-fg-subtle">—</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {license.devices.map((device) => (
              <li key={device.id} className="rounded-xl bg-ink-800/70 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-fg-muted">{device.device}</p>
                    <p className="mt-1 text-fg-subtle">
                      {device.ip_address ?? '—'}
                      {device.last_used_at ? ` · ${format.dateTimeWithUtc(device.last_used_at)}` : null}
                    </p>
                    {device.user_agent ? (
                      <p className="mt-1 truncate text-xs text-fg-subtle">{device.user_agent}</p>
                    ) : null}
                  </div>
                  {confirmDeviceId === device.id ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        loading={deleteDevice.isPending}
                        onClick={() => void onRemoveDevice(device.id)}
                      >
                        {t('common:actions.confirm')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDeviceId(null)}>
                        {t('common:actions.cancel')}
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDeviceId(device.id)}>
                      <Trash2 aria-hidden className="size-3.5" />
                      {t('licenses.removeDevice')}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {confirmDelete ? (
          <>
            <Button fullWidth loading={deleteLicense.isPending} variant="danger" onClick={() => void onDelete()}>
              {t('common:actions.confirm')}
            </Button>
            <Button fullWidth variant="secondary" onClick={() => setConfirmDelete(false)}>
              {t('common:actions.cancel')}
            </Button>
          </>
        ) : (
          <>
            <Button
              fullWidth
              disabled={!canSave}
              loading={updateLicense.isPending}
              onClick={() => void onSave()}
            >
              {t('licenses.save')}
            </Button>
            <Button fullWidth variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden className="size-3.5" />
              {t('licenses.delete')}
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}
