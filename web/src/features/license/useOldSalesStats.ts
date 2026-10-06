import { useQuery } from '@tanstack/react-query'

import { getLicenseOldSalesStats } from '@/shared/api/license'
import { shouldRetryPublicStats } from '@/shared/api/queryClient'

export function useOldSalesStats() {
  return useQuery({
    queryKey: ['license', 'old-sales-stats'],
    queryFn: ({ signal }) => getLicenseOldSalesStats(signal),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: shouldRetryPublicStats,
    retryDelay: 0,
  })
}
