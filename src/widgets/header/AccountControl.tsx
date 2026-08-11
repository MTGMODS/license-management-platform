import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useAuthStore } from '@/features/auth'
import { Avatar, Skeleton, buttonStyles } from '@/shared/ui'

export function AccountControl() {
  const { t } = useTranslation('header')
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)

  if (status === 'initialising') {
    return <Skeleton className="h-9 w-28" label={t('account.cabinet')} />
  }

  if (status === 'anonymous' || !user) {
    return (
      <Link to="/login" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
        {t('account.cabinet')}
      </Link>
    )
  }

  return (
    <Link
      to="/dashboard"
      className="group flex items-center gap-2.5 rounded-xl py-1 pr-1 pl-1 transition-colors duration-200 hover:bg-ink-800 sm:pr-3"
    >
      <Avatar src={user.avatar_url} name={user.nickname} />

      {/* The identity block is the first thing to go on narrow screens; the
          avatar alone still reads as "your account". */}
      <span className="hidden min-w-0 flex-col leading-tight sm:flex">
        <span className="truncate text-sm font-medium text-fg">{user.nickname}</span>
        <span className="tabular text-xs text-fg-subtle">
          {user.id === null ? t('account.cabinet') : t('account.id', { id: user.id })}
        </span>
      </span>
    </Link>
  )
}
