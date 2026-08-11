import { useEffect, useRef, type ReactNode } from 'react'

import { getTokens, onSessionExpired } from '@/shared/api'
import { authenticateWithTelegramInitData } from '@/shared/api/user'

import { handleSessionExpired, useAuthStore } from './authStore'
import { getTelegramInitData, initTelegramChrome } from './telegram'

/**
 * Resolves the session once at startup and keeps it in sync with the HTTP
 * layer. Inside the Telegram Mini App a signed `initData` blob is available on
 * launch, which lets the user arrive already authenticated with no popup.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const started = useRef(false)

  useEffect(() => onSessionExpired(handleSessionExpired), [])

  useEffect(() => {
    // StrictMode mounts effects twice in development; signing in twice would
    // issue two token pairs and race the store.
    if (started.current) return
    started.current = true

    initTelegramChrome()

    const { bootstrap, completeSignIn } = useAuthStore.getState()
    const initData = getTelegramInitData()

    // An existing session takes precedence: it may belong to an account the
    // user linked deliberately, and re-authenticating would silently swap it.
    if (!initData || getTokens()) {
      void bootstrap()
      return
    }

    authenticateWithTelegramInitData(initData)
      .then(completeSignIn)
      .catch(() => bootstrap())
  }, [])

  return children
}
