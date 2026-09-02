import type { ApiDate, ApiDateTime } from '@/shared/lib/datetime'

/** Precomputed window keys on `/stats/public`. */
export type PeriodKey = 'all_time' | '30d' | '24h' | '1h'

export const PERIOD_KEYS: readonly PeriodKey[] = ['all_time', '30d', '24h', '1h']

/** A metric broken down by all four precomputed windows. */
export type PeriodCounts = Record<PeriodKey, number>

export interface UsageOverviewMetrics {
  /** Percentage on a 0-100 scale. */
  vip_conversion: number
  pc_ratio: number
  mobile_ratio: number
  global_launches_per_user: number
}

export interface DeviceFamilyStats {
  users: PeriodCounts
  launches: PeriodCounts
  vip_users: PeriodCounts
  /** Share of overview users for the window, 0–100. */
  user_share: PeriodCounts
  launches_per_user: PeriodCounts
  /** Share of device-family users with VIP for the window, 0–100. */
  vip_percent: PeriodCounts
}

export interface UsageOverview {
  metrics: UsageOverviewMetrics
  users: {
    total: PeriodCounts
    vip: PeriodCounts
    free: PeriodCounts
  }
  launches: PeriodCounts
  devices: {
    pc: DeviceFamilyStats
    mobile: DeviceFamilyStats
  }
}

export interface FactionStats {
  /** Mode key from the helper, e.g. `police`, `none`. */
  mode: string
  users: PeriodCounts
  launches: PeriodCounts
  vip_users: PeriodCounts
  /** Share of overview users for the window, 0–100. */
  user_share: PeriodCounts
  launches_per_user: PeriodCounts
  /** Share of faction users with VIP for the window, 0–100. */
  vip_percent: PeriodCounts
}

export interface ServerStats {
  /** Numeric SAMP server id; the backend has no human-readable names. */
  server: number
  /** Share of overview users for the window, 0–100. */
  user_share: PeriodCounts
  launches_per_user: PeriodCounts
  users: PeriodCounts
  launches: PeriodCounts
  vip_users: PeriodCounts
  /** Share of server users with VIP for the window, 0–100. */
  vip_percent: PeriodCounts
}

export interface VersionStats {
  version: string
  users: PeriodCounts
  /** Share of overview users for the window, 0–100. */
  user_share: PeriodCounts
  launches: PeriodCounts
  launches_per_user: PeriodCounts
}

export type ProductKey = 'arizona_pc' | 'arizona_mobile' | 'rodina_pc' | 'rodina_mobile'

export interface ProductStats {
  product: ProductKey | string
  /** Share of overview users for the window, 0–100. */
  user_share: PeriodCounts
  launches_per_user: PeriodCounts
  users: PeriodCounts
  launches: PeriodCounts
  vip_users: PeriodCounts
  /** Share of product users with VIP for the window, 0–100. */
  vip_percent: PeriodCounts
}

export interface DailyPoint {
  /** UTC calendar day (`YYYY-MM-DD`). Days without activity are omitted. */
  date: ApiDate
  users: number
  /** Unique HWIDs whose helper version string contains VIP. */
  vip_users: number
  launches: number
  launches_per_user: number
}

export interface HourlyTimelinePoint {
  date: ApiDate
  hour: number
  users: number
  /** Unique HWIDs whose helper version string contains VIP. */
  vip_users: number
  launches: number
  launches_per_user: number
}

export interface HourActivityPoint {
  /** 0-23. */
  hour: number
  users: number
  launches: number
  launches_per_user: number
}

export interface WeekdayActivityPoint {
  /** PostgreSQL `dow`: 0 = Sunday through 6 = Saturday. */
  weekday: number
  users: number
  launches: number
  launches_per_user: number
}

export interface UsagePublicStats {
  updated_at: ApiDateTime
  overview: UsageOverview
  distribution: {
    factions: FactionStats[]
    servers: ServerStats[]
    versions: VersionStats[]
    products: ProductStats[]
  }
  analytics: {
    timeline: {
      /** All-time, regardless of the selected period. */
      daily: DailyPoint[]
      /** All-time hour buckets (`date` + `hour`). Hours without activity are omitted. */
      hourly: HourlyTimelinePoint[]
    }
    activity: {
      hourly: HourActivityPoint[]
      weekday: WeekdayActivityPoint[]
    }
  }
}
