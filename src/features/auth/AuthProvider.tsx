import { useEffect, useRef, type ReactNode } from 'react'

import { onSessionExpired } from '@/shared/api'

import { handleSessionExpired, useAuthStore } from './authStore'
import { initTelegramChrome, loadTelegramWebAppScript } from './telegram'

/**
 * Resolves the stored session once at startup. Telegram Mini App chrome is
 * initialised here; WebApp `initData` sign-in runs only when the user clicks
 * “Sign in with Telegram” on `/login`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const started = useRef(false)

  useEffect(() => onSessionExpired(handleSessionExpired), [])

  useEffect(() => {
    if (started.current) return
    started.current = true

    void loadTelegramWebAppScript().then(() => {
      initTelegramChrome()
    })
    void useAuthStore.getState().bootstrap()
  }, [])

  return children
}
