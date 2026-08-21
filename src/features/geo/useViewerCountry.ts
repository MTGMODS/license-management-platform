import { useQuery } from '@tanstack/react-query'

import { isBankCardAllowed, resolveViewerCountry } from '@/shared/lib/viewerCountry'

export const VIEWER_COUNTRY_KEY = ['viewer-country'] as const

export function useViewerCountry() {
  return useQuery({
    queryKey: VIEWER_COUNTRY_KEY,
    queryFn: ({ signal }) => resolveViewerCountry(signal),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

/** True unless IP geolocation confidently places the visitor in RU/BY. */
export function useBankCardAllowed() {
  const { data: country, isPending } = useViewerCountry()
  return {
    isPending,
    country: country ?? null,
    allowed: isBankCardAllowed(country ?? null),
  }
}
