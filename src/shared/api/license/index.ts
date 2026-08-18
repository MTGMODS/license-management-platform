import { request } from '../http'

import type {
  ActivateKeyResult,
  DownloadRequestResult,
  LicenseInfo,
  LicenseSalesStats,
  TariffsCatalog,
} from './types'

/** Length enforced by the backend DTO: `XXXX-XXXX-XXXX-XXXX`. */
export const LICENSE_KEY_LENGTH = 19

export const LICENSE_KEY_PATTERN = /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/

export function getLicenseInfo(signal?: AbortSignal): Promise<LicenseInfo> {
  return request<LicenseInfo>({ service: 'license', path: '/info', auth: true, signal })
}

/**
 * Public sales figures behind the VIP page.
 *
 * This is the one endpoint that wraps its payload in `{ status, data }`;
 * `/info` on the very same service returns the object directly, so the
 * envelope is unwrapped here rather than in the shared HTTP layer.
 */
export async function getLicenseSalesStats(signal?: AbortSignal): Promise<LicenseSalesStats> {
  const response = await request<{ status: string; data: LicenseSalesStats }>({
    service: 'license',
    path: '/stats/public',
    signal,
  })

  return response.data
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
