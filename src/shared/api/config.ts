export type ServiceName = 'user' | 'license' | 'usage' | 'distribution'

/**
 * Path prefixes are fixed by the backend routers and double as the routing key
 * for the dev proxy, so they stay identical in both environments.
 */
const SERVICE_PREFIX: Record<ServiceName, string> = {
  user: '/api/v1/users',
  license: '/api/v1/license',
  usage: '/api/v1/usage',
  distribution: '/api/v1/files',
}

function normalizeBase(value: string | undefined): string {
  if (!value) return ''
  return value.replace(/\/+$/, '')
}

const SERVICE_BASE: Record<ServiceName, string> = {
  user: normalizeBase(import.meta.env.VITE_USER_API_URL),
  license: normalizeBase(import.meta.env.VITE_LICENSE_API_URL),
  usage: normalizeBase(import.meta.env.VITE_USAGE_API_URL),
  distribution: normalizeBase(import.meta.env.VITE_DISTRIBUTION_API_URL),
}

/** Builds an absolute-or-same-origin URL for a path relative to a service. */
export function serviceUrl(service: ServiceName, path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${SERVICE_BASE[service]}${SERVICE_PREFIX[service]}${suffix}`
}

/** Origin of a service, used to validate OAuth popup `postMessage` senders. */
export function serviceOrigin(service: ServiceName): string {
  const base = SERVICE_BASE[service]
  if (!base) return window.location.origin
  try {
    return new URL(base, window.location.origin).origin
  } catch {
    return window.location.origin
  }
}

export const REQUEST_TIMEOUT_MS = 20_000
