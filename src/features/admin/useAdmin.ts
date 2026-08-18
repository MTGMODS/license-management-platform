import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deleteAdminDevice,
  findLicenses,
  generateLicense,
  generateLicensesBulk,
  searchUsers,
  updateAdminLicense,
  updateAdminUser,
  type GenerateKeysPayload,
  type UpdateLicensePayload,
  type UpdateUserPayload,
} from '@/shared/api/admin'
import { getTariffs } from '@/shared/api/license'

export const ADMIN_USERS_KEY = ['admin', 'users'] as const
export const ADMIN_LICENSES_KEY = ['admin', 'licenses'] as const
export const ADMIN_TARIFFS_KEY = ['admin', 'tariffs'] as const

export function useAdminUserSearch(
  query: { nickname?: string; telegram_id?: string; discord_id?: string } | null,
) {
  const enabled = Boolean(query && (query.nickname || query.telegram_id || query.discord_id))

  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, query],
    queryFn: ({ signal }) => searchUsers(query!, signal),
    enabled,
  })
}

export function useAdminLicenseSearch(query: { user_id?: number; key?: string } | null) {
  const enabled = Boolean(query && (query.user_id != null || query.key))

  return useQuery({
    queryKey: [...ADMIN_LICENSES_KEY, query],
    queryFn: ({ signal }) => findLicenses(query!, signal),
    enabled,
  })
}

export function useTariffs() {
  return useQuery({
    queryKey: ADMIN_TARIFFS_KEY,
    queryFn: ({ signal }) => getTariffs(signal),
  })
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: UpdateUserPayload }) =>
      updateAdminUser(userId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY })
    },
  })
}

export function useGenerateLicense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<GenerateKeysPayload, 'count'>) => generateLicense(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_LICENSES_KEY })
    },
  })
}

export function useGenerateLicensesBulk() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: GenerateKeysPayload) => generateLicensesBulk(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_LICENSES_KEY })
    },
  })
}

export function useUpdateAdminLicense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ licenseId, payload }: { licenseId: number; payload: UpdateLicensePayload }) =>
      updateAdminLicense(licenseId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_LICENSES_KEY })
    },
  })
}

export function useDeleteAdminDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (deviceId: number) => deleteAdminDevice(deviceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_LICENSES_KEY })
    },
  })
}
