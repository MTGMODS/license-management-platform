import { useQuery } from '@tanstack/react-query'

import { getLicenseOldSalesStats } from '@/shared/api/license'
import { shouldRetryPublicStats } from '@/shared/api/queryClient'

export function useOldSalesStats() {
  return useQuery({
    queryKey: ['license', 'old-sales-stats'],
    queryFn: ({ signal }) => getLicenseOldSalesStats(signal),
    staleTime: 0,
    gcTime: 0,
    retry: shouldRetryPublicStats,
    retryDelay: 0,
  })
}
