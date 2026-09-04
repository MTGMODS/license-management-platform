import { create } from 'zustand'

import { clearLocalSession, clearTokens, getTokens, NetworkError, setTokens, TimeoutError, type AuthTokens } from '@/shared/api'
import { clearUserQueries } from '@/shared/api/queryClient'
import { getCurrentUser, logoutSession, type TokenResponse, type User } from '@/shared/api/user'

export type AuthStatus = 'initialising' | 'authenticated' | 'anonymous'

interface AuthState {
  status: AuthStatus
  user: User | null
  /** Resolves the stored session once on startup. Safe to call repeatedly. */
  bootstrap: () => Promise<void>
  /** Persists a successful sign-in from any provider flow. */
  completeSignIn: (response: TokenResponse) => void
  signOut: () => Promise<void>
  setUser: (user: User) => void
}

let bootstrapPromise: Promise<void> | null = null

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'initialising',
  user: null,

  bootstrap: () => {
    bootstrapPromise ??= (async () => {
      const tokens = getTokens()

      if (!tokens) {
        set({ status: 'anonymous', user: null })
        return
      }

      try {
        const user = await getCurrentUser()
        set({ status: 'authenticated', user })
      } catch (error) {
        if (error instanceof NetworkError || error instanceof TimeoutError) {
          // Keep tokens; the UI can retry bootstrap without a forced sign-out.
          set({ status: 'authenticated', user: null })
          return
        }

        // The HTTP layer already attempted a refresh. Reaching here means the
        // session is unusable, so drop it rather than leaving a half-signed-in
        // header on screen.
        clearTokens()
        clearUserQueries()
        set({ status: 'anonymous', user: null })
      }
    })().finally(() => {
      bootstrapPromise = null
    })

    return bootstrapPromise
  },

  completeSignIn: (response) => {
    // Drop the previous account's private caches before switching identity.
    clearUserQueries()
    const tokens: AuthTokens = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    }
    setTokens(tokens)
    set({ status: 'authenticated', user: response.user })
  },

  signOut: async () => {
    const refreshToken = getTokens()?.refreshToken
    if (refreshToken) {
      try {
        await logoutSession(refreshToken)
      } catch {
        // 401 / network: still drop the local session.
      }
    }

    clearTokens()
    clearUserQueries()
    set({ status: 'anonymous', user: null })
  },

  setUser: (user) => {
    set({ user })
  },
}))

/** Drops local state when the HTTP layer reports the session as unrecoverable. */
export function handleSessionExpired(): void {
  clearLocalSession()
  clearUserQueries()
  useAuthStore.setState({ status: 'anonymous', user: null })
}
