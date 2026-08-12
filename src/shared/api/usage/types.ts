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

export interface UsageOverview {
  metrics: UsageOverviewMetrics
  users: {
    total: PeriodCounts
    vip: PeriodCounts
    free: PeriodCounts
  }
  launches: PeriodCounts
  devices: {
    pc: PeriodCounts
    mobile: PeriodCounts
  }
}

export interface FactionStats {
  total_users: number
  user_share: number
  launches: number
  launches_per_user: number
  vip_users: number
  vip_percent: number
}

export interface ServerStats {
  /** Numeric SAMP server id; the backend has no human-readable names. */
  server: number
  user_share: number
  launches_per_user: number
  users: PeriodCounts
  launches: PeriodCounts
}

export interface CountryStats {
  /** ISO 3166-1 alpha-2, or the literal `UNKNOWN`. */
  code: string
  user_share: number
  launches_per_user: number
  users: PeriodCounts
  /** All-time only, unlike `users`. */
  launches: number
}

export interface VersionStats {
  version: string
  users: number
  user_share: number
  launches: number
  launches_per_user: number
}

export interface DailyPoint {
  /** UTC calendar day (`YYYY-MM-DD`). Days without activity are omitted. */
  date: ApiDate
  users: number
  launches: number
}

export interface HourlyTimelinePoint {
  date: ApiDate
  hour: number
  users: number
  launches: number
}

export interface HourActivityPoint {
  /** 0-23. */
  hour: number
  users: number
  launches: number
}

export interface WeekdayActivityPoint {
  /** PostgreSQL `dow`: 0 = Sunday through 6 = Saturday. */
  weekday: number
  users: number
  launches: number
}

export interface UsagePublicStats {
  updated_at: ApiDateTime
  overview: UsageOverview
  distribution: {
    /** Keyed by mode name rather than an array. */
    factions: Record<string, FactionStats>
    servers: ServerStats[]
    countries: CountryStats[]
    versions: VersionStats[]
  }
  analytics: {
    timeline: {
      /** All-time, regardless of the selected period. */
      daily: DailyPoint[]
      /** Fixed 24-hour window. */
      hourly: HourlyTimelinePoint[]
    }
    activity: {
      hourly: HourActivityPoint[]
      weekday: WeekdayActivityPoint[]
    }
  }
}
