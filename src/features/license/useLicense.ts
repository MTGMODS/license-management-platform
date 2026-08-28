import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/authStore'
import { isNoActiveLicense } from '@/shared/api'
import {
  activateKey,
  getLicenseHistory,
  getLicenseInfo,
  requestPremiumDownload,
  resetDevice,
  type ActivateKeyResult,
  type DownloadRequestResult,
  type LicenseInfo,
} from '@/shared/api/license'

export const LICENSE_INFO_KEY = ['license', 'info'] as const
export const LICENSE_HISTORY_KEY = ['license', 'history'] as const

export function licenseOwnerKey(
  user: { id: number | null; discord_id: string | null; telegram_id: string | null } | null,
) {
  if (!user) return 'anonymous'
  if (user.id !== null) return `id:${user.id}`
  if (user.discord_id) return `discord:${user.discord_id}`
  if (user.telegram_id) return `telegram:${user.telegram_id}`
  return 'unknown'
}

export function useLicenseInfo(enabled: boolean) {
  const user = useAuthStore((state) => state.user)
  const owner = licenseOwnerKey(user)

  return useQuery<LicenseInfo | null>({
    queryKey: [...LICENSE_INFO_KEY, owner],
    queryFn: async ({ signal }) => {
      try {
        return await getLicenseInfo(signal)
      } catch (error) {
        if (isNoActiveLicense(error)) return null
        throw error
      }
    },
    enabled: enabled && owner !== 'anonymous',
    staleTime: 60_000,
  })
}

export function useLicenseHistory(enabled: boolean) {
  const user = useAuthStore((state) => state.user)
  const owner = licenseOwnerKey(user)

  return useQuery<LicenseInfo[]>({
    queryKey: [...LICENSE_HISTORY_KEY, owner],
    queryFn: ({ signal }) => getLicenseHistory(signal),
    enabled: enabled && owner !== 'anonymous',
    staleTime: 60_000,
  })
}

export function useActivateKey() {
  const queryClient = useQueryClient()

  return useMutation<ActivateKeyResult, unknown, { key: string; force?: boolean }>({
    mutationFn: ({ key, force }) => activateKey(key, force),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LICENSE_INFO_KEY })
      void queryClient.invalidateQueries({ queryKey: LICENSE_HISTORY_KEY })
    },
  })
}

export function usePremiumDownload() {
  return useMutation<DownloadRequestResult>({
    mutationFn: () => requestPremiumDownload(),
  })
}

export function useResetDevice() {
  const queryClient = useQueryClient()

  return useMutation<{ status: string; message: string }, unknown, number>({
    mutationFn: (deviceId) => resetDevice(deviceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LICENSE_INFO_KEY })
    },
  })
}
