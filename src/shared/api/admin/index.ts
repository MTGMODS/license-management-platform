import { request } from '../http'
import type { User } from '../user'

import type {
  AdminLicense,
  GenerateKeysPayload,
  GenerateOneResult,
  UpdateLicensePayload,
  UpdateUserPayload,
} from './types'

interface Envelope<T> {
  status: string
  message?: string
  count?: number
  data: T
}

function unwrap<T>(payload: Envelope<T>): T {
  return payload.data
}

export function searchUsers(
  query: { nickname?: string; telegram_id?: string; discord_id?: string },
  signal?: AbortSignal,
): Promise<User[]> {
  return request<User[]>({
    service: 'user',
    path: '/search',
    query,
    auth: true,
    signal,
  })
}

export function getAdminUser(userId: number, signal?: AbortSignal): Promise<User> {
  return request<User>({
    service: 'user',
    path: `/${userId}`,
    auth: true,
    signal,
  })
}

export async function updateAdminUser(userId: number, payload: UpdateUserPayload): Promise<User> {
  const response = await request<Envelope<User>>({
    service: 'user',
    path: `/${userId}`,
    method: 'PATCH',
    auth: true,
    body: payload,
  })
  return unwrap(response)
}

export async function generateLicense(payload: Omit<GenerateKeysPayload, 'count'>): Promise<GenerateOneResult> {
  const response = await request<Envelope<GenerateOneResult>>({
    service: 'license',
    path: '/generate',
    method: 'POST',
    auth: true,
    body: payload,
  })
  return unwrap(response)
}

export async function generateLicensesBulk(payload: GenerateKeysPayload): Promise<string[]> {
  const response = await request<Envelope<{ keys: string[] }>>({
    service: 'license',
    path: '/generate/bulk',
    method: 'POST',
    auth: true,
    body: payload,
  })
  return unwrap(response).keys
}

export async function findLicenses(
  query: { user_id?: number; key?: string },
  signal?: AbortSignal,
): Promise<AdminLicense[]> {
  const response = await request<Envelope<AdminLicense[]>>({
    service: 'license',
    path: '/find',
    query,
    auth: true,
    signal,
  })
  return unwrap(response)
}

export async function getAdminLicense(
  licenseId: number,
  signal?: AbortSignal,
): Promise<AdminLicense> {
  const response = await request<Envelope<AdminLicense>>({
    service: 'license',
    path: `/${licenseId}`,
    auth: true,
    signal,
  })
  return unwrap(response)
}

export async function updateAdminLicense(
  licenseId: number,
  payload: UpdateLicensePayload,
): Promise<unknown> {
  return request({
    service: 'license',
    path: `/${licenseId}`,
    method: 'PATCH',
    auth: true,
    body: payload,
  })
}

export function deleteAdminDevice(deviceId: number): Promise<{ status: string; message: string }> {
  return request({
    service: 'license',
    path: `/devices/${deviceId}`,
    method: 'DELETE',
    auth: true,
  })
}

export function deleteAdminLicense(licenseId: number): Promise<{ status: string; message: string }> {
  return request({
    service: 'license',
    path: `/${licenseId}`,
    method: 'DELETE',
    auth: true,
  })
}

export type {
  AdminLicense,
  AdminLicenseDevice,
  AdminLicenseTransaction,
  GenerateKeysPayload,
  GenerateOneResult,
  UpdateLicensePayload,
  UpdateUserPayload,
} from './types'
