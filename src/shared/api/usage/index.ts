import { request } from '../http'

import type {
  CountryStats,
  FactionStats,
  PeriodCounts,
  PeriodKey,
  UsagePublicStats,
  VersionStats,
} from './types'
import { PERIOD_KEYS } from './types'

/**
 * While the usage service migrates flat counters to period maps, older
 * payloads still send a single number. Spread it across every window so the
 * UI keeps working until the new shape arrives.
 */
function asPeriodCounts(value: unknown): PeriodCounts {
  if (value && typeof value === 'object') {
    const source = value as Partial<Record<PeriodKey, unknown>>
    const out = {} as PeriodCounts
    for (const key of PERIOD_KEYS) {
      const item = source[key]
      out[key] = typeof item === 'number' && Number.isFinite(item) ? item : 0
    }
    return out
  }

  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return { all_time: n, '30d': n, '24h': n, '1h': n }
}

function normalizeFaction(raw: Record<string, unknown>, fallbackMode = 'unknown'): FactionStats {
  const mode =
    typeof raw.mode === 'string' && raw.mode
      ? raw.mode
      : fallbackMode

  return {
    mode,
    users: asPeriodCounts(raw.users ?? raw.total_users),
    launches: asPeriodCounts(raw.launches),
    vip_users: asPeriodCounts(raw.vip_users),
    user_share: typeof raw.user_share === 'number' ? raw.user_share : 0,
    launches_per_user: typeof raw.launches_per_user === 'number' ? raw.launches_per_user : 0,
    vip_percent: typeof raw.vip_percent === 'number' ? raw.vip_percent : 0,
  }
}

/** New API: array of `{ mode, ... }`. Legacy: `{ police: {...}, ... }`. */
function normalizeFactions(raw: unknown): FactionStats[] {
  if (Array.isArray(raw)) {
    return raw.map((item) =>
      normalizeFaction(
        item && typeof item === 'object' ? (item as Record<string, unknown>) : {},
      ),
    )
  }

  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, Record<string, unknown>>).map(([mode, stats]) =>
      normalizeFaction(stats ?? {}, mode),
    )
  }

  return []
}

function normalizeVersion(raw: Record<string, unknown>): VersionStats {
  return {
    version: typeof raw.version === 'string' ? raw.version : 'unknown',
    users: asPeriodCounts(raw.users),
    launches: asPeriodCounts(raw.launches),
    user_share: typeof raw.user_share === 'number' ? raw.user_share : 0,
    launches_per_user: typeof raw.launches_per_user === 'number' ? raw.launches_per_user : 0,
  }
}

function normalizeCountry(raw: Record<string, unknown>): CountryStats {
  return {
    code: typeof raw.code === 'string' ? raw.code : 'UNKNOWN',
    users: asPeriodCounts(raw.users),
    launches: asPeriodCounts(raw.launches),
    user_share: typeof raw.user_share === 'number' ? raw.user_share : 0,
    launches_per_user: typeof raw.launches_per_user === 'number' ? raw.launches_per_user : 0,
  }
}

function normalizePublicStats(payload: UsagePublicStats): UsagePublicStats {
  const versionsRaw = payload.distribution.versions as unknown as Record<string, unknown>[]
  const countriesRaw = payload.distribution.countries as unknown as Record<string, unknown>[]

  return {
    ...payload,
    distribution: {
      ...payload.distribution,
      factions: normalizeFactions(payload.distribution.factions),
      versions: versionsRaw.map(normalizeVersion),
      countries: countriesRaw.map(normalizeCountry),
    },
  }
}

/**
 * Single payload backing the whole analytics section. All four period windows
 * arrive precomputed, so switching the period is a client-side reselect rather
 * than a refetch. The backend caches it for five minutes with stale-while-revalidate.
 */
export async function getUsagePublicStats(signal?: AbortSignal): Promise<UsagePublicStats> {
  const payload = await request<UsagePublicStats>({
    service: 'usage',
    path: '/stats/public',
    signal,
  })
  return normalizePublicStats(payload)
}

export * from './types'
