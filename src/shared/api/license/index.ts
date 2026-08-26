import { request } from '../http'

import type {
  ActivateKeyResult,
  DownloadRequestResult,
  LicenseDurationStat,
  LicenseInfo,
  LicensePaymentStat,
  LicenseSalesStats,
  TariffsCatalog,
} from './types'

/** Length enforced by the backend DTO: `XXXX-XXXX-XXXX-XXXX`. */
export const LICENSE_KEY_LENGTH = 19

export const LICENSE_KEY_PATTERN = /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/

export function getLicenseInfo(signal?: AbortSignal): Promise<LicenseInfo> {
  return request<LicenseInfo>({ service: 'license', path: '/info', auth: true, signal })
}

/** Past licences for the signed-in user. Empty array when there is no history. */
export function getLicenseHistory(signal?: AbortSignal): Promise<LicenseInfo[]> {
  return request<LicenseInfo[]>({ service: 'license', path: '/history', auth: true, signal })
}

/**
 * Current `/stats/public` wire shape. Older clients still expect `new_subs` /
 * `old_forever`; we normalize once here so charts stay unchanged.
 */
interface SalesStatsWire {
  updated_at: string
  new_subs?: LicenseSalesStats['new_subs']
  old_forever?: LicenseSalesStats['old_forever']
  subscriptions?: {
    overview?: {
      total_sold?: number
      total_money?: number
      active?: number
      free_issued?: number
      free_active?: number
    }
    by_duration?: Array<{
      duration_days?: number
      count?: number
      sum?: number
      active?: number
    }>
    by_method?: Array<{
      method?: string
      count?: number
      sum?: number
    }>
  }
  forever?: {
    overview?: {
      total_sold?: number
      total_money?: number
    }
  }
}

function asFinite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeSalesStats(raw: SalesStatsWire): LicenseSalesStats {
  if (raw.new_subs && raw.old_forever) {
    return {
      updated_at: raw.updated_at,
      new_subs: raw.new_subs,
      old_forever: raw.old_forever,
    }
  }

  const overview = raw.subscriptions?.overview ?? {}
  const durations: LicenseDurationStat[] = (raw.subscriptions?.by_duration ?? []).map((item) => ({
    days: asFinite(item.duration_days),
    count: asFinite(item.count),
    sum: asFinite(item.sum),
    active: asFinite(item.active),
  }))
  const payments: LicensePaymentStat[] = (raw.subscriptions?.by_method ?? []).map((item) => ({
    method: typeof item.method === 'string' ? item.method : 'Unknown',
    count: asFinite(item.count),
    sum: asFinite(item.sum),
  }))
  const forever = raw.forever?.overview ?? {}

  return {
    updated_at: raw.updated_at,
    new_subs: {
      total_vips: asFinite(overview.total_sold),
      active_total: asFinite(overview.active),
      total_money: asFinite(overview.total_money),
      free_issued: asFinite(overview.free_issued),
      free_active: asFinite(overview.free_active),
      top_durations: durations,
      top_payments: payments,
    },
    old_forever: {
      total_sold: asFinite(forever.total_sold),
      total_money: asFinite(forever.total_money),
    },
  }
}

/**
 * Public sales figures behind the VIP page.
 *
 * This is the one endpoint that wraps its payload in `{ status, data }`;
 * `/info` on the very same service returns the object directly, so the
 * envelope is unwrapped here rather than in the shared HTTP layer.
 */
export async function getLicenseSalesStats(signal?: AbortSignal): Promise<LicenseSalesStats> {
  const response = await request<{ status: string; data: SalesStatsWire }>({
    service: 'license',
    path: '/stats/public',
    signal,
  })

  return normalizeSalesStats(response.data)
}

export async function getTariffs(signal?: AbortSignal): Promise<TariffsCatalog> {
  const response = await request<{ status: string; data: TariffsCatalog }>({
    service: 'license',
    path: '/tariffs',
    signal,
  })
  return response.data
}

/**
 * Activates a VIP key.
 *
 * With an active licence already present the backend rejects the call with
 * 409 `ACTIVE_LICENSE_EXISTS`. Passing `force` retries destructively: the old
 * licence is expired immediately and its remaining time is lost, not carried
 * over, so callers must confirm with the user first.
 */
export function activateKey(key: string, force = false): Promise<ActivateKeyResult> {
  return request<ActivateKeyResult>({
    service: 'license',
    path: '/activate',
    method: 'POST',
    auth: true,
    body: { key, force },
  })
}

/** Asks the backend to build a personalised VIP file and return its URL. */
export function requestPremiumDownload(): Promise<DownloadRequestResult> {
  return request<DownloadRequestResult>({
    service: 'license',
    path: '/download',
    method: 'POST',
    auth: true,
  })
}

export function resetDevice(deviceId: number): Promise<{ status: string; message: string }> {
  return request({
    service: 'license',
    path: `/device/${deviceId}`,
    method: 'DELETE',
    auth: true,
  })
}

export type {
  ActivateKeyResult,
  DownloadRequestResult,
  LicenseDetails,
  LicenseDevice,
  LicenseDurationStat,
  LicenseInfo,
  LicensePaymentStat,
  LicenseSalesStats,
  LicenseStatus,
  LicenseTransaction,
  PaymentMethod,
  TariffPlan,
  TariffsCatalog,
} from './types'
