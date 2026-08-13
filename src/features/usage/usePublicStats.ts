import { useQuery } from '@tanstack/react-query'

import { getUsagePublicStats, type UsagePublicStats } from '@/shared/api/usage'

export const USAGE_PUBLIC_STATS_KEY = ['usage', 'public-stats'] as const

/**
 * Backs the entire analytics section from a single request. All four period
 * windows arrive precomputed, so changing the period is a client-side reselect.
 *
 * Cached for the same five minutes the backend caches it, which also keeps the
 * app well clear of the gateway's rate limiter during development reloads.
 */
export function usePublicStats() {
  return useQuery<UsagePublicStats>({
    queryKey: USAGE_PUBLIC_STATS_KEY,
    queryFn: ({ signal }) => getUsagePublicStats(signal),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
  })
}
