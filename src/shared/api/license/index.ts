import { request } from '../http'

import type { ActivateKeyResult, DownloadRequestResult, LicenseInfo } from './types'

/** Length enforced by the backend DTO: `XXXX-XXXX-XXXX-XXXX`. */
export const LICENSE_KEY_LENGTH = 19

export const LICENSE_KEY_PATTERN = /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/

export function getLicenseInfo(signal?: AbortSignal): Promise<LicenseInfo> {
  return request<LicenseInfo>({ service: 'license', path: '/info', auth: true, signal })
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
  LicenseInfo,
  LicenseStatus,
  LicenseTransaction,
  PaymentMethod,
} from './types'
