import { useQuery } from '@tanstack/react-query'

import { fetchReleaseManifest, type ReleaseManifest } from '@/shared/api/release'

export const RELEASE_QUERY_KEY = ['release-manifest'] as const

/**
 * Current helper version and free download link, read from the manifest
 * published in the helper repository. Cached generously: releases happen far
 * less often than page views.
 */
export function useRelease() {
  return useQuery<ReleaseManifest>({
    queryKey: RELEASE_QUERY_KEY,
    queryFn: ({ signal }) => fetchReleaseManifest(signal),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  })
}
