export type LicenseStatus = 'NOT_ACTIVATED' | 'ACTIVE' | 'EXPIRED' | 'BANNED'

/** Values of the backend `PaymentMethod` enum. */
export type PaymentMethod = 'Stars' | 'FunPay' | 'Crypto' | 'PayPal' | 'Card'

export interface LicenseDevice {
  id: number
  /** Masked server-side, e.g. `abc******xyz`. */
  hwid: string
  /** Masked server-side, e.g. `192.168.*.*`, or `Unknown`. */
  ip: string
  last_used_at: string | null
}

export interface LicenseDetails {
  id: number
  user_id: number | null
  key: string
  status: LicenseStatus
  /** Null on legacy lifetime licenses. */
  duration_days: number | null
  max_devices: number
  reset_limit: number
  activated_at: string | null
  /** ISO 8601. The backend does not precompute remaining time. */
  expires_at: string | null
}

export interface LicenseTransaction {
  amount: number
  /** Free-form string column; matches `PaymentMethod` in practice. */
  method: string
  status: string
  purchased_at: string
}

export interface LicenseInfo {
  license: LicenseDetails
  devices: LicenseDevice[]
  /** Null for keys issued without a recorded purchase. */
  transaction: LicenseTransaction | null
}

export interface ActivateKeyResult {
  status: string
  message: string
}

export interface DownloadRequestResult {
  status: string
  message: string
  /** Single-use URL served by the Distribution Service; expires after 1 hour. */
  download_url: string
}
