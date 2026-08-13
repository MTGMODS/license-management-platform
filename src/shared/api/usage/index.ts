import { request } from '../http'

import type {
  CountryStats,
  DeviceFamilyStats,
  FactionStats,
  PeriodCounts,
  PeriodKey,
  ProductStats,
  ServerStats,
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
    user_share: asPeriodCounts(raw.user_share),
    launches_per_user: asPeriodCounts(raw.launches_per_user),
    vip_percent: asPeriodCounts(raw.vip_percent),
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

function normalizeServer(raw: Record<string, unknown>): ServerStats {
  return {
    server: typeof raw.server === 'number' && Number.isFinite(raw.server) ? raw.server : 0,
    users: asPeriodCounts(raw.users),
    launches: asPeriodCounts(raw.launches),
    user_share: asPeriodCounts(raw.user_share),
    launches_per_user: asPeriodCounts(raw.launches_per_user),
  }
}

function normalizeVersion(raw: Record<string, unknown>): VersionStats {
  return {
    version: typeof raw.version === 'string' ? raw.version : 'unknown',
    users: asPeriodCounts(raw.users),
    launches: asPeriodCounts(raw.launches),
    user_share: asPeriodCounts(raw.user_share),
    launches_per_user: asPeriodCounts(raw.launches_per_user),
  }
}

function normalizeCountry(raw: Record<string, unknown>): CountryStats {
  return {
    code: typeof raw.code === 'string' ? raw.code : 'UNKNOWN',
    users: asPeriodCounts(raw.users),
    launches: asPeriodCounts(raw.launches),
    user_share: asPeriodCounts(raw.user_share),
    launches_per_user: asPeriodCounts(raw.launches_per_user),
  }
}

function normalizeProduct(raw: Record<string, unknown>): ProductStats {
  return {
    product: typeof raw.product === 'string' ? raw.product : 'unknown',
    users: asPeriodCounts(raw.users),
    launches: asPeriodCounts(raw.launches),
    user_share: asPeriodCounts(raw.user_share),
    launches_per_user: asPeriodCounts(raw.launches_per_user),
  }
}

function normalizeDeviceFamily(raw: unknown): DeviceFamilyStats {
  if (raw && typeof raw === 'object' && ('users' in raw || 'launches' in raw)) {
    const source = raw as Record<string, unknown>
    return {
      users: asPeriodCounts(source.users),
      launches: asPeriodCounts(source.launches),
    }
  }

  // Legacy shape was a bare PeriodCounts map for users only.
  const users = asPeriodCounts(raw)
  return { users, launches: { all_time: 0, '30d': 0, '24h': 0, '1h': 0 } }
}

function normalizePublicStats(payload: UsagePublicStats): UsagePublicStats {
  const serversRaw = (payload.distribution.servers ?? []) as unknown as Record<string, unknown>[]
  const versionsRaw = (payload.distribution.versions ?? []) as unknown as Record<string, unknown>[]
  const countriesRaw = (payload.distribution.countries ?? []) as unknown as Record<string, unknown>[]
  const productsRaw = (payload.distribution.products ?? []) as unknown as Record<string, unknown>[]
  const devicesRaw = payload.overview.devices as unknown as Record<string, unknown>

  return {
    ...payload,
    overview: {
      ...payload.overview,
      devices: {
        pc: normalizeDeviceFamily(devicesRaw?.pc),
        mobile: normalizeDeviceFamily(devicesRaw?.mobile),
      },
    },
    distribution: {
      ...payload.distribution,
      factions: normalizeFactions(payload.distribution.factions),
      servers: serversRaw.map(normalizeServer),
      versions: versionsRaw.map(normalizeVersion),
      countries: countriesRaw.map(normalizeCountry),
      products: productsRaw.map(normalizeProduct),
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
