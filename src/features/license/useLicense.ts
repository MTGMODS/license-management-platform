import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  activateKey,
  getLicenseInfo,
  requestPremiumDownload,
  type ActivateKeyResult,
  type DownloadRequestResult,
  type LicenseInfo,
} from '@/shared/api/license'

export const LICENSE_INFO_KEY = ['license', 'info'] as const

export function useLicenseInfo(enabled: boolean) {
  return useQuery<LicenseInfo>({
    queryKey: LICENSE_INFO_KEY,
    queryFn: ({ signal }) => getLicenseInfo(signal),
    enabled,
    staleTime: 60_000,
  })
}

export function useActivateKey() {
  const queryClient = useQueryClient()

  return useMutation<ActivateKeyResult, unknown, { key: string; force?: boolean }>({
    mutationFn: ({ key, force }) => activateKey(key, force),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LICENSE_INFO_KEY })
    },
  })
}

export function usePremiumDownload() {
  return useMutation<DownloadRequestResult>({
    mutationFn: () => requestPremiumDownload(),
  })
}
