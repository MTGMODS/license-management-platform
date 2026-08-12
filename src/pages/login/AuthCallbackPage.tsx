import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import {
  AUTH_BROADCAST_CHANNEL,
  AUTH_SUCCESS_TYPE,
  isAuthBroadcastMessage,
  type AuthBroadcastMessage,
} from '@/features/auth/authChannel'
import { useAuthStore } from '@/features/auth/authStore'
import { readTokenResponse } from '@/features/auth/popupAuth'
import { consumeOAuthHandoff } from '@/shared/api/user'

const HASH_STORAGE_KEY = 'mtg_oauth_callback_hash'

/** Dedupes Strict Mode double-mount so a ticket is only consumed once. */
const handoffInflight = new Map<string, Promise<AuthBroadcastMessage>>()

function takeHandoff(ticket: string): Promise<AuthBroadcastMessage> {
  const existing = handoffInflight.get(ticket)
  if (existing) return existing

  const pending = consumeOAuthHandoff(ticket).then((raw) => {
    if (!isAuthBroadcastMessage(raw)) {
      throw new Error('Invalid auth handoff payload')
    }
    return raw
  })

  handoffInflight.set(ticket, pending)
  return pending
}

function readHashMessage(): AuthBroadcastMessage | null {
  const fromHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const raw = fromHash || sessionStorage.getItem(HASH_STORAGE_KEY)
  if (!raw) return null

  if (fromHash) {
    sessionStorage.setItem(HASH_STORAGE_KEY, raw)
  }

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw))
    return isAuthBroadcastMessage(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * OAuth return for full-page mobile flow and popup COOP fallback.
 * Accepts `?ticket=` (handoff API) or `#` JSON payload from older backends.
 */
export function AuthCallbackPage() {
  const { t } = useTranslation(['login', 'errors'])
  const navigate = useNavigate()
  const completeSignIn = useAuthStore((state) => state.completeSignIn)
  const [status, setStatus] = useState<'working' | 'done' | 'error' | 'empty'>('working')

  useEffect(() => {
    let cancelled = false

    const applyMessage = (message: AuthBroadcastMessage) => {
      try {
        const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL)
        channel.postMessage(message)
        channel.close()
      } catch {
        // ignore
      }

      if (message.type === AUTH_SUCCESS_TYPE) {
        const tokens = readTokenResponse(message.payload)
        if (tokens) {
          completeSignIn(tokens)
          sessionStorage.removeItem(HASH_STORAGE_KEY)
          setStatus('done')
          void navigate('/dashboard', { replace: true })
          return
        }
      }

      const code =
        'error_code' in message && typeof message.error_code === 'string'
          ? message.error_code
          : null
      const key = code ? `errors:code.${code}` : 'errors:auth.failed'
      toast.error(t(key, { defaultValue: t('errors:auth.failed') }))
      setStatus('error')
    }

    const params = new URLSearchParams(window.location.search)
    const ticket = params.get('ticket')
    const hashMessage = readHashMessage()

    window.history.replaceState(null, '', window.location.pathname)

    if (ticket) {
      void (async () => {
        try {
          const message = await takeHandoff(ticket)
          if (!cancelled) applyMessage(message)
        } catch {
          if (!cancelled) setStatus('empty')
        }
      })()
      return () => {
        cancelled = true
      }
    }

    if (hashMessage) {
      applyMessage(hashMessage)
      return
    }

    setStatus('empty')
  }, [completeSignIn, navigate, t])

  return (
    <div className="shell flex min-h-[50vh] flex-col items-center justify-center gap-3 py-16 text-sm text-fg-muted">
      {status === 'working' ? t('login:callback.working') : null}
      {status === 'done' ? t('login:callback.done') : null}
      {status === 'empty' ? t('login:callback.empty') : null}
      {status === 'error' ? (
        <>
          <p>{t('login:callback.error')}</p>
          <Link to="/login" className="text-accent underline-offset-2 hover:underline">
            {t('login:callback.backToLogin')}
          </Link>
        </>
      ) : null}
      {status === 'empty' ? (
        <Link to="/login" className="text-accent underline-offset-2 hover:underline">
          {t('login:callback.backToLogin')}
        </Link>
      ) : null}
    </div>
  )
}
