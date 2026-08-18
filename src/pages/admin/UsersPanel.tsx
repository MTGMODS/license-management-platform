import { Search, Unlink } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useAdminUserSearch, useUpdateAdminUser, type AdminUserLookup } from '@/features/admin/useAdmin'
import { apiErrorTranslationKey } from '@/shared/api'
import type { User, UserRole, UserStatus } from '@/shared/api/user'
import { useFormatters } from '@/shared/lib/format'
import { Avatar, Badge, Button, Card, SegmentedControl, Skeleton } from '@/shared/ui'

const SEARCH_TYPES = ['id', 'telegram_id', 'discord_id', 'nickname'] as const
type SearchType = (typeof SEARCH_TYPES)[number]

const ROLES: UserRole[] = ['USER', 'SMART', 'ADMIN']
const STATUSES: UserStatus[] = ['ACTIVE', 'BANNED', 'DELETED']

const inputClass =
  'rounded-xl border border-white/8 bg-ink-800 px-4 py-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent-500/40'

function statusTone(status: UserStatus): 'positive' | 'negative' | 'neutral' {
  if (status === 'ACTIVE') return 'positive'
  if (status === 'BANNED') return 'negative'
  return 'neutral'
}

function isNumericSearch(type: SearchType): boolean {
  return type === 'id' || type === 'telegram_id' || type === 'discord_id'
}

export function UsersPanel({
  initialUserId,
  onConsumedInitialUserId,
  onOpenLicenses,
}: {
  initialUserId: number | null
  onConsumedInitialUserId: () => void
  onOpenLicenses: (userId: number) => void
}) {
  const { t } = useTranslation('admin')
  const { t: te } = useTranslation('errors')
  const format = useFormatters()
  const [searchType, setSearchType] = useState<SearchType>('id')
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState<AdminUserLookup | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const users = useAdminUserSearch(query)
  const updateUser = useUpdateAdminUser()

  useEffect(() => {
    if (initialUserId == null) return
    setSearchType('id')
    setDraft(String(initialUserId))
    setQuery({ user_id: initialUserId })
    setSelectedId(initialUserId)
    onConsumedInitialUserId()
  }, [initialUserId, onConsumedInitialUserId])

  const onSearch = (event: FormEvent) => {
    event.preventDefault()
    const value = draft.trim()
    if (!value) return
    if (searchType === 'id') {
      const userId = Number(value)
      if (!Number.isInteger(userId) || userId <= 0) return
      setQuery({ user_id: userId })
      setSelectedId(userId)
      return
    }
    setQuery({ [searchType]: value } as AdminUserLookup)
  }

  const selected = users.data?.find((user) => user.id === selectedId) ?? users.data?.[0] ?? null

  const onSave = async (user: User, payload: { role: UserRole; status: UserStatus }) => {
    if (user.id == null) return
    try {
      await updateUser.mutateAsync({ userId: user.id, payload })
      toast.success(t('users.saved'))
    } catch (error) {
      toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('unexpected') }))
    }
  }

  const onUnlink = async (user: User, field: 'telegram_id' | 'discord_id') => {
    if (user.id == null) return
    try {
      await updateUser.mutateAsync({ userId: user.id, payload: { [field]: null } })
      toast.success(t('users.saved'))
    } catch (error) {
      toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('unexpected') }))
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">{t('tabs.users')}</h2>
        <SegmentedControl
          className="mt-5"
          fullWidth
          label={t('users.searchLabel')}
          value={searchType}
          onChange={(next) => {
            setSearchType(next)
            setDraft('')
          }}
          options={[
            { id: 'id', label: t('users.byId') },
            { id: 'telegram_id', label: t('users.byTelegram') },
            { id: 'discord_id', label: t('users.byDiscord') },
            { id: 'nickname', label: t('users.byNickname') },
          ]}
        />
        <form onSubmit={onSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={draft}
            onChange={(event) =>
              setDraft(isNumericSearch(searchType) ? event.target.value.replace(/\D/g, '') : event.target.value)
            }
            placeholder={searchType === 'id' ? t('users.placeholderId') : t('users.placeholder')}
            inputMode={isNumericSearch(searchType) ? 'numeric' : 'text'}
            className={`${inputClass} min-w-0 w-full flex-1`}
          />
          <Button type="submit" disabled={!draft.trim()} loading={users.isFetching} className="sm:w-auto">
            <Search aria-hidden className="size-4" />
            {t('users.action')}
          </Button>
        </form>
        <p className="mt-4 text-sm text-fg-muted">{t('users.hint')}</p>
      </Card>

      {!query ? null : users.isPending ? (
        <Skeleton className="h-48" />
      ) : users.isError ? (
        <Card className="p-6">
          <p className="text-sm text-fg-muted">{te('unexpected')}</p>
        </Card>
      ) : users.data.length === 0 ? (
        <Card className="p-6">
          <p className="font-medium">{t('users.empty')}</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <ul className="space-y-2">
            {users.data.map((user) => {
              const active = user.id === (selected?.id ?? null)
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(user.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                      active
                        ? 'border-accent-500/30 bg-accent-500/10'
                        : 'border-white/5 bg-ink-900/50 hover:border-white/10'
                    }`}
                  >
                    <Avatar src={user.avatar_url} name={user.nickname} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{user.nickname}</p>
                      <p className="tabular text-xs text-fg-subtle">
                        {t('users.id')} {user.id}
                      </p>
                    </div>
                    <Badge tone={statusTone(user.status)}>{t(`users.statuses.${user.status}`)}</Badge>
                  </button>
                </li>
              )
            })}
          </ul>

          {selected && selected.id != null ? (
            <UserEditor
              key={selected.id}
              user={selected}
              saving={updateUser.isPending}
              onSave={onSave}
              onUnlink={onUnlink}
              onOpenLicenses={onOpenLicenses}
              formatDate={format.dateTimeWithUtc}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

function UserEditor({
  user,
  saving,
  onSave,
  onUnlink,
  onOpenLicenses,
  formatDate,
}: {
  user: User
  saving: boolean
  onSave: (user: User, payload: { role: UserRole; status: UserStatus }) => void
  onUnlink: (user: User, field: 'telegram_id' | 'discord_id') => void
  onOpenLicenses: (userId: number) => void
  formatDate: (iso: string) => string
}) {
  const { t } = useTranslation('admin')
  const [role, setRole] = useState(user.role)
  const [status, setStatus] = useState(user.status)

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <Avatar src={user.avatar_url} name={user.nickname} className="size-14 text-base" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{user.nickname}</p>
          <p className="tabular text-sm text-fg-subtle">
            {t('users.id')} {user.id}
          </p>
          {user.created_at ? <p className="mt-1 text-sm text-fg-muted">{formatDate(user.created_at)}</p> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-fg-subtle">{t('users.role')}</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className={`${inputClass} mt-1.5 w-full`}
          >
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {t(`users.roles.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-fg-subtle">{t('users.status')}</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as UserStatus)}
            className={`${inputClass} mt-1.5 w-full`}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`users.statuses.${value}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <dt className="text-fg-subtle">{t('users.telegram')}</dt>
            <dd className="tabular mt-0.5">{user.telegram_id ?? '—'}</dd>
          </div>
          {user.telegram_id ? (
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => onUnlink(user, 'telegram_id')}>
              <Unlink aria-hidden className="size-3.5" />
              {t('users.unlink')}
            </Button>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <dt className="text-fg-subtle">{t('users.discord')}</dt>
            <dd className="tabular mt-0.5">{user.discord_id ?? '—'}</dd>
          </div>
          {user.discord_id ? (
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => onUnlink(user, 'discord_id')}>
              <Unlink aria-hidden className="size-3.5" />
              {t('users.unlink')}
            </Button>
          ) : null}
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button loading={saving} onClick={() => onSave(user, { role, status })}>
          {t('users.save')}
        </Button>
        {user.id != null ? (
          <Button variant="secondary" onClick={() => onOpenLicenses(user.id!)}>
            {t('users.licenses')}
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
