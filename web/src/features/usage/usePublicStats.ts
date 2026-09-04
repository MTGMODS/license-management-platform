import { useQuery } from '@tanstack/react-query'

import { ApiError, NetworkError, TimeoutError } from '@/shared/api/errors'
import { getUsagePublicStats, type UsagePublicStats } from '@/shared/api/usage'

export const USAGE_PUBLIC_STATS_KEY = ['usage', 'public-stats'] as const

/**
 * Backs the entire analytics section from a single request. All four period
 * windows arrive precomputed, so changing the period is a client-side reselect.
 *
 * Cached for the same five minutes the backend caches it. Soft-fails when the
 * usage service is down so VIP / helper pages still load tariffs and sales.
 */
export function usePublicStats() {
  return useQuery<UsagePublicStats>({
    queryKey: USAGE_PUBLIC_STATS_KEY,
    queryFn: ({ signal }) => getUsagePublicStats(signal),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: (failureCount, error) => {
      if (
        error instanceof NetworkError ||
        error instanceof TimeoutError ||
        (error instanceof ApiError && error.status < 500)
      ) {
        return false
      }
      return failureCount < 1
    },
  })
}
