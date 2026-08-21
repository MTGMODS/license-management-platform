import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'
import {
  deleteAdminDevice,
  deleteAdminLicense,
  findLicenses,
  generateLicense,
  generateLicensesBulk,
  getAdminUser,
  searchUsers,
  updateAdminLicense,
  updateAdminUser,
  type GenerateKeysPayload,
  type UpdateLicensePayload,
  type UpdateUserPayload,
} from '@/shared/api/admin'

export type AdminUserLookup =
  | { user_id: number }
  | { nickname: string }
  | { telegram_id: string }
  | { discord_id: string }

export const ADMIN_USERS_KEY = ['admin', 'users'] as const
export const ADMIN_LICENSES_KEY = ['admin', 'licenses'] as const

export function useAdminUserSearch(query: AdminUserLookup | null) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, query],
    queryFn: async ({ signal }) => {
      if (!query) return []
      if ('user_id' in query) {
        try {
          return [await getAdminUser(query.user_id, signal)]
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) return []
          throw error
        }
      }
      return searchUsers(query, signal)
    },
    enabled: query != null,
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

export function useDeleteAdminLicense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (licenseId: number) => deleteAdminLicense(licenseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_LICENSES_KEY })
    },
  })
}
