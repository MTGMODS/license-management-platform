export type ServiceName = 'user' | 'license' | 'usage' | 'distribution'

/**
 * Public gateway prefixes, as served by api.mtgmods.com. The services mount
 * their routers under `/api/v1/...` internally and the gateway strips the
 * `/api` segment, so `/api/v1/usage/stats/public` is a 404 in production while
 * `/v1/usage/stats/public` is the live route.
 *
 * These double as the routing key for the dev proxy, which re-adds the `/api`
 * segment when pointed straight at a service (see vite.config.ts).
 */
const SERVICE_PREFIX: Record<ServiceName, string> = {
  user: '/v1/users',
  license: '/v1/license',
  usage: '/v1/usage',
  distribution: '/v1/files',
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
  if (base) {
    try {
      return new URL(base, window.location.origin).origin
    } catch {
      return window.location.origin
    }
  }

  // Dev with empty VITE_*_API_URL: fetches are same-origin via the Vite proxy,
  // but the OAuth callback HTML is still served from the direct user service.
  if (service === 'user') {
    const direct = import.meta.env.VITE_DEV_USER_TARGET
    if (typeof direct === 'string' && direct) {
      try {
        return new URL(direct).origin
      } catch {
        // fall through
      }
    }
  }

  return window.location.origin
}

export const REQUEST_TIMEOUT_MS = 20_000
