import { useQuery } from '@tanstack/react-query'

import { getLicenseSalesStats, type LicenseSalesStats } from '@/shared/api/license'

export const SALES_STATS_KEY = ['license', 'sales-stats'] as const

export function useSalesStats() {
  return useQuery<LicenseSalesStats>({
    queryKey: SALES_STATS_KEY,
    queryFn: ({ signal }) => getLicenseSalesStats(signal),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  })
}
