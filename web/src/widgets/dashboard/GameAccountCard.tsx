import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gamepad2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useAuthStore } from '@/features/auth/authStore'
import { licenseOwnerKey } from '@/features/license/useLicense'
import { apiErrorTranslationKey } from '@/shared/api'
import { deleteGameAccount, getGameAccount, saveGameAccount, type GameAccount } from '@/shared/api/license'
import { GAME_SERVERS } from '@/shared/config/servers'
import { Button, Card, Skeleton } from '@/shared/ui'

const SELECTABLE_SERVERS = GAME_SERVERS.filter(({ id }) => id < 200)

function GameAccountForm({ account, owner }: { account: GameAccount | null; owner: string }) {
  const { t } = useTranslation('dashboard')
  const { t: te } = useTranslation('errors')
  const queryClient = useQueryClient()
  const [serverId, setServerId] = useState(() => (
    SELECTABLE_SERVERS.find(({ id }) => id === account?.server_id)?.id ?? 0
  ))
  const [nickname, setNickname] = useState(account?.nickname ?? '')
  const mutation = useMutation({
    mutationFn: (next: GameAccount | null) => next ? saveGameAccount(next) : deleteGameAccount().then(() => null),
    onSuccess: (next) => {
      queryClient.setQueryData(['license', 'game-account', owner], next)
      toast.success(t('gameAccount.saved'))
    },
    onError: (error) => toast.error(te(apiErrorTranslationKey(error), { defaultValue: te('unexpected') })),
  })
  const valid = SELECTABLE_SERVERS.some(({ id }) => id === serverId) && /^[A-Za-z][A-Za-z0-9_]{2,49}$/.test(nickname)
  const unchanged = account?.server_id === serverId && account.nickname === nickname
  const fieldClass = 'w-full rounded-xl border border-white/8 bg-ink-800 px-4 py-3 text-sm text-fg outline-none focus:border-accent-500/40'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (valid && !mutation.isPending) mutation.mutate({ server_id: serverId, nickname })
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-fg-muted">
          <span>{t('gameAccount.server')}</span>
          <select
            value={serverId}
            onChange={event => setServerId(Number(event.target.value))}
            disabled={mutation.isPending}
            className={fieldClass}
            required
          >
            <option value={0} disabled>{t('gameAccount.chooseServer')}</option>
            {SELECTABLE_SERVERS.map(server => (
              <option key={server.id} value={server.id}>[{server.id}] {server.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-fg-muted">
          <span>{t('gameAccount.nickname')}</span>
          <input
            value={nickname}
            onChange={event => setNickname(event.target.value)}
            disabled={mutation.isPending}
            placeholder="Player_Name"
            minLength={3}
            maxLength={50}
            pattern="[A-Za-z][A-Za-z0-9_]{2,49}"
            autoComplete="off"
            spellCheck={false}
            className={fieldClass}
            required
          />
        </label>
      </div>
      <p className="text-xs text-fg-subtle">{t('gameAccount.nicknameHint')}</p>
      {valid ? <p className="font-mono text-sm text-accent-300">[{serverId}]{nickname}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={!valid || unchanged || mutation.isPending}
          loading={mutation.isPending && mutation.variables !== null}
        >
          {t('gameAccount.save')}
        </Button>
        {account ? (
          <Button variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate(null)}>
            {t('gameAccount.remove')}
          </Button>
        ) : null}
      </div>
    </form>
  )
}

export function GameAccountCard() {
  const { t } = useTranslation('dashboard')
  const owner = licenseOwnerKey(useAuthStore(state => state.user))
  const query = useQuery({
    queryKey: ['license', 'game-account', owner],
    queryFn: ({ signal }) => getGameAccount(signal),
    enabled: owner !== 'anonymous',
  })
  return (
    <Card className="p-6 sm:p-8">
      <h2 className="flex items-center gap-3 text-lg font-semibold">
        <Gamepad2 aria-hidden className="size-5 text-accent-300" />
        {t('gameAccount.title')}
      </h2>
      <p className="mt-2 text-sm text-fg-muted">{t('gameAccount.description')}</p>
      <p className="mt-3 text-sm font-medium text-caution">{t('gameAccount.publicNotice')}</p>
      <p className="mt-1 text-sm text-fg-muted">{t('gameAccount.privacyHint')}</p>
      {query.isPending ? <Skeleton className="mt-5 h-28" /> : query.isError ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-fg-muted">
          <span>{t('gameAccount.loadError')}</span>
          <Button variant="secondary" onClick={() => void query.refetch()}>{t('gameAccount.retry')}</Button>
        </div>
      ) : (
        <GameAccountForm
          key={`${owner}:${query.data?.server_id}:${query.data?.nickname}`}
          account={query.data ?? null}
          owner={owner}
        />
      )}
    </Card>
  )
}
