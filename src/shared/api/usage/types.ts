/**
 * Period selector values.
 *
 * The two backends disagree on the "all time" literal: `/stats/public` nests
 * its precomputed windows under `all_time`, while the query builder's `period`
 * parameter expects `all`. `PERIOD_QUERY_VALUE` bridges the two.
 */
export type PeriodKey = 'all_time' | '30d' | '24h' | '1h'

export type QueryPeriod = 'all' | '30d' | '24h' | '1h'

export const PERIOD_KEYS: readonly PeriodKey[] = ['all_time', '30d', '24h', '1h']

export const PERIOD_QUERY_VALUE: Record<PeriodKey, QueryPeriod> = {
  all_time: 'all',
  '30d': '30d',
  '24h': '24h',
  '1h': '1h',
}

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
  /** All-time only, unlike `users`. Period-scoped values need the query builder. */
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
  /** `YYYY-MM-DD`. Days without activity are omitted entirely. */
  date: string
  users: number
  launches: number
}

export interface HourlyTimelinePoint {
  date: string
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
  updated_at: string
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

export type UsageMetric =
  | 'users'
  | 'launches'
  | 'vip_users'
  | 'free_users'
  | 'vip_percent'
  | 'launches_per_user'

export type UsageGroupBy =
  | 'server'
  | 'country'
  | 'mode'
  | 'device'
  | 'version'
  | 'date'
  | 'hour'
  | 'weekday'

export type UsageFilterField = 'server' | 'mode' | 'country' | 'device' | 'version' | 'vip'

/** Response of `/stats/query/schema`, used to drive the Query Builder UI. */
export interface UsageQuerySchema {
  metrics: UsageMetric[]
  groups: UsageGroupBy[]
  periods: QueryPeriod[]
  filters: UsageFilterField[]
}

export interface UsageQueryParams {
  metric?: UsageMetric[]
  group_by?: UsageGroupBy | null
  period?: QueryPeriod
  server?: number | null
  mode?: string | null
  country?: string | null
  device?: string | null
  version?: string | null
  vip?: boolean | null
  /** Prefix with `-` for descending, e.g. `-users`. */
  sort?: string | null
  /** Backend caps this at 1000; there is no "all" value. */
  limit?: number
  offset?: number
}

/** Rows are shaped by the requested metrics and grouping, so keys are dynamic. */
export type UsageQueryRow = Record<string, string | number | null>

export interface UsageQueryResult {
  query: {
    metrics: string[]
    group_by: string | null
    period: string
    filters: Record<string, unknown>
    sort: string | null
    limit: number
    offset: number
  }
  data: UsageQueryRow[]
}

export const USAGE_QUERY_LIMIT_MAX = 1000
