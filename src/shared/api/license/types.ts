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

/** Paid time-limited subscription duration bucket. */
export interface LicenseDurationStat {
  days: number
  count: number
  /** Money actually taken (discounts / Stars rounding). */
  sum: number
  active: number
  /** Share of subscription count, 0–100. */
  count_share: number
  /** Share of subscription revenue, 0–100. */
  money_share: number
}

/** Payment-method bucket (subscriptions or forever). */
export interface LicensePaymentStat {
  method: string
  count: number
  sum: number
  count_share: number
  money_share: number
}

export interface LicensePurchaseBucket {
  purchases: number
  renewals: number
  users: number
  sum: number
  /** Share of buyers, 0–100. */
  share: number
}

export interface LicenseRetentionStats {
  buyers: number
  repeat_buyers: number
  /** Percent of buyers with 2+ purchases. */
  repeat_rate: number
  avg_subscriptions_per_buyer: number
  avg_check: number
  avg_revenue_per_buyer: number
  by_purchases: LicensePurchaseBucket[]
}

export interface LicenseTimelineDay {
  date: string
  count: number
  sum: number
}

export interface LicenseTimelineMonth {
  month: string
  count: number
  sum: number
}

/**
 * Public sale row — no key / id / user_id.
 * Prefer `activated_at` as the purchase date when displaying (see normalize).
 */
export interface LicenseSaleRow {
  purchased_at: ApiDateTime | null
  amount: number
  method: string
  duration_days: number | null
  status: string
  activated_at: ApiDateTime | null
  expires_at: ApiDateTime | null
}

export interface LicenseSubscriptionsStats {
  overview: {
    total_sold: number
    total_money: number
    active: number
    first_sale_at: ApiDateTime | null
    last_sale_at: ApiDateTime | null
    avg_check: number
    avg_subscriptions_per_buyer: number
    avg_revenue_per_buyer: number
  }
  by_duration: LicenseDurationStat[]
  by_method: LicensePaymentStat[]
  retention: LicenseRetentionStats
  timeline: {
    daily: LicenseTimelineDay[]
    monthly: LicenseTimelineMonth[]
  }
  sales: LicenseSaleRow[]
}

/** Paid forever keys bucketed by actual purchase price. */
export interface LicensePriceStat {
  price: number
  count: number
  sum: number
  count_share: number
  money_share: number
}

/** Legacy forever keys — no reliable purchase dates after migration. */
export interface LicenseForeverStats {
  overview: {
    paid_sold: number
    total_money: number
    active: number
    avg_check: number
  }
  by_price: LicensePriceStat[]
  by_method: LicensePaymentStat[]
}

export interface LicenseSalesStats {
  updated_at: ApiDateTime
  subscriptions: LicenseSubscriptionsStats
  forever: LicenseForeverStats
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

/** Defaults from `GET /license/tariffs`. Generate still accepts overrides. */
export interface TariffLimits {
  max_devices: number
  reset_limit: number
}

export interface TariffPlan extends TariffLimits {
  duration_days: number
  /** Catalog price in `TariffsCatalog.currency`. */
  price: number
  telegram_stars_price?: number
}

export interface TariffsCatalog {
  currency: string
  plans: TariffPlan[]
}
