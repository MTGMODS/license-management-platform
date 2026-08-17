import type { ApiDateTime } from '@/shared/lib/datetime'

export type LicenseStatus = 'NOT_ACTIVATED' | 'ACTIVE' | 'EXPIRED' | 'BANNED'

/** Values of the backend `PaymentMethod` enum. */
export type PaymentMethod = 'Stars' | 'FunPay' | 'Crypto' | 'PayPal' | 'Card' | 'Steam' | 'Gift' | 'Promo'

export interface LicenseDevice {
  id: number
  /** Masked server-side, e.g. `abc******xyz`. */
  hwid: string
  /** Masked server-side, e.g. `192.168.*.*`, or `Unknown`. */
  ip: string
  /** First bind time (`created_at` on the device row). */
  first_used_at?: ApiDateTime | null
  last_used_at: ApiDateTime | null
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
  activated_at: ApiDateTime | null
  expires_at: ApiDateTime | null
}

export interface LicenseTransaction {
  amount: number
  /** Free-form string column; matches `PaymentMethod` in practice. */
  method: string
  status: string
  purchased_at: ApiDateTime
}

export interface LicenseInfo {
  license: LicenseDetails
  devices: LicenseDevice[]
  /** Null for keys issued without a recorded purchase. */
  transaction: LicenseTransaction | null
}

export interface LicenseDurationStat {
  days: number
  count: number
  /** Money actually taken, which is not price times count: real sales include
   *  discounts and Stars conversion rounding. */
  sum: number
  /** How many of these are still active now. */
  active: number
}

export interface LicensePaymentStat {
  method: string
  count: number
  sum: number
}

export interface LicenseSalesStats {
  updated_at: ApiDateTime
  /** Time-limited subscriptions, the only kind sold now. */
  new_subs: {
    total_vips: number
    active_total: number
    /** USD. Both breakdowns below sum to exactly this figure. */
    total_money: number
    free_issued: number
    free_active: number
    top_durations: LicenseDurationStat[]
    top_payments: LicensePaymentStat[]
  }
  /** Legacy lifetime keys, no longer offered. */
  old_forever: {
    total_sold: number
    total_money: number
  }
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
