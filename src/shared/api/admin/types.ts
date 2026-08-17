import type { ApiDateTime } from '@/shared/lib/datetime'
import type { LicenseStatus, PaymentMethod } from '@/shared/api/license'
import type { User, UserRole, UserStatus } from '@/shared/api/user'

export interface AdminLicenseDevice {
  id: number
  /** Full HWID — admin find does not mask it. */
  device: string
  ip_address: string | null
  user_agent: string | null
  first_used_at: ApiDateTime | null
  last_used_at: ApiDateTime | null
}

export interface AdminLicenseTransaction {
  id: number
  amount: number
  method: string
  status: string
  purchased_at: ApiDateTime | null
}

export interface AdminLicense {
  id: number
  user_id: number | null
  key: string
  status: LicenseStatus
  duration_days: number | null
  max_devices: number
  reset_limit: number
  created_at: ApiDateTime | null
  activated_at: ApiDateTime | null
  expires_at: ApiDateTime | null
  devices: AdminLicenseDevice[]
  transaction: AdminLicenseTransaction | null
}

export interface UpdateUserPayload {
  status?: UserStatus
  role?: UserRole
  telegram_id?: string | null
  discord_id?: string | null
}

export interface GenerateKeysPayload {
  count: number
  duration_days: number
  amount: number
  method: PaymentMethod
  status?: 'PENDING' | 'COMPLETED'
  max_devices: number
}

export interface GenerateOneResult {
  key: string
  transaction_id: number
}

export interface UpdateLicensePayload {
  status?: LicenseStatus
  reset_limit?: number
  max_devices?: number
}

export type { User }
