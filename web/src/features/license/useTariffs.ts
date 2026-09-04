import { useQuery } from '@tanstack/react-query'

import { getTariffs, type TariffsCatalog } from '@/shared/api/license'

export const TARIFFS_KEY = ['license', 'tariffs'] as const

export function useTariffs() {
  return useQuery<TariffsCatalog>({
    queryKey: TARIFFS_KEY,
    queryFn: ({ signal }) => getTariffs(signal),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  })
}
