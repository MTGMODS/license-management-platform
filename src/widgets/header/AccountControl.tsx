import { LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'

import { useAuthStore } from '@/features/auth'
import { Avatar, Skeleton, buttonStyles } from '@/shared/ui'

export function AccountControl() {
  const { t } = useTranslation('header')
  const navigate = useNavigate()
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

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

  const onSignOut = () => {
    signOut()
    setOpen(false)
    void navigate('/', { replace: true })
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="group flex items-center gap-2.5 rounded-xl py-1 pr-1 pl-1 transition-colors duration-200 hover:bg-ink-800 sm:pr-3"
      >
        <Avatar src={user.avatar_url} name={user.nickname} />
        <span className="hidden min-w-0 flex-col leading-tight sm:flex">
          <span className="truncate text-sm font-medium text-fg">{user.nickname}</span>
          <span className="tabular text-xs text-fg-subtle">
            {user.id === null ? t('account.cabinet') : t('account.id', { id: user.id })}
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 py-1 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.75)]"
        >
          <Link
            role="menuitem"
            to="/dashboard"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm text-fg transition-colors hover:bg-ink-800"
          >
            {t('account.cabinet')}
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-fg-muted transition-colors hover:bg-ink-800 hover:text-fg"
          >
            <LogOut aria-hidden className="size-4" />
            {t('account.logout')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
