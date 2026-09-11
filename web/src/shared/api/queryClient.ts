import { QueryClient } from '@tanstack/react-query'

import { ApiError } from './errors'

/** One immediate retry (5s + 5s). 4xx is a real answer — do not repeat it. */
export function shouldRetryPublicStats(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false
  return failureCount < 1
}

/**
 * Shared client so auth can drop user-scoped caches on sign-in / sign-out
 * without waiting for a full page reload.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Public analytics are cached for five minutes server-side, so a
      // shorter client window would only produce identical payloads.
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})

/** License (and future private) queries must not leak across accounts. */
export function clearUserQueries(): void {
  void queryClient.removeQueries({ queryKey: ['license'] })
  void queryClient.removeQueries({ queryKey: ['admin'] })
}
