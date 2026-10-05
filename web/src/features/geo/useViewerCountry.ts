import { useQuery } from '@tanstack/react-query'

import { resolveViewerCountry } from '@/shared/lib/viewerCountry'

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
