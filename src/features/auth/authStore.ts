import { create } from 'zustand'

import { clearTokens, getTokens, setTokens, type AuthTokens } from '@/shared/api'
import { getCurrentUser, type TokenResponse, type User } from '@/shared/api/user'

export type AuthStatus = 'initialising' | 'authenticated' | 'anonymous'

interface AuthState {
  status: AuthStatus
  user: User | null
  /** Resolves the stored session once on startup. Safe to call repeatedly. */
  bootstrap: () => Promise<void>
  /** Persists a successful sign-in from any provider flow. */
  completeSignIn: (response: TokenResponse) => void
  signOut: () => void
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
      } catch {
        // The HTTP layer already attempted a refresh. Reaching here means the
        // session is unusable, so drop it rather than leaving a half-signed-in
        // header on screen.
        clearTokens()
        set({ status: 'anonymous', user: null })
      }
    })().finally(() => {
      bootstrapPromise = null
    })

    return bootstrapPromise
  },

  completeSignIn: (response) => {
    const tokens: AuthTokens = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    }
    setTokens(tokens)
    set({ status: 'authenticated', user: response.user })
  },

  signOut: () => {
    clearTokens()
    set({ status: 'anonymous', user: null })
  },

  setUser: (user) => {
    set({ user })
  },
}))

/** Drops local state when the HTTP layer reports the session as unrecoverable. */
export function handleSessionExpired(): void {
  useAuthStore.setState({ status: 'anonymous', user: null })
}
