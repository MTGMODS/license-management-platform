import { useEffect, useRef, type ReactNode } from 'react'

import { AUTH_STORAGE_KEYS, onSessionExpired } from '@/shared/api'

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
    const onStorage = (event: StorageEvent) => {
      if (!event.key || !(AUTH_STORAGE_KEYS as readonly string[]).includes(event.key)) return
      if (!event.newValue) {
        handleSessionExpired()
        return
      }
      void useAuthStore.getState().bootstrap()
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

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
