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

/** Public API host (`https://api.mtgmods.com`). Empty string if unset. */
export function gatewayBase(): string {
  return normalizeBase(import.meta.env.VITE_API_URL)
}

/**
 * Browser fetch base. Vite dev always stays same-origin so the proxy can mix
 * local `VITE_DEV_*_TARGET` ports with the public gateway per prefix.
 * Production talks to `VITE_API_URL` directly.
 */
function requestBase(): string {
  if (import.meta.env.DEV) return ''
  return gatewayBase()
}

/** Builds an absolute-or-same-origin URL for a path relative to a service. */
export function serviceUrl(service: ServiceName, path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${requestBase()}${SERVICE_PREFIX[service]}${suffix}`
}

function originOf(url: string): string | null {
  try {
    return new URL(url, window.location.origin).origin
  } catch {
    return null
  }
}

/** Origin of a service, used to validate OAuth popup `postMessage` senders. */
export function serviceOrigin(service: ServiceName): string {
  if (service === 'user' && import.meta.env.DEV) {
    const direct = import.meta.env.VITE_DEV_USER_TARGET
    if (typeof direct === 'string' && direct.trim()) {
      return originOf(direct.trim()) ?? window.location.origin
    }
  }

  const gateway = gatewayBase()
  if (gateway) return originOf(gateway) ?? window.location.origin

  return window.location.origin
}

export const REQUEST_TIMEOUT_MS = 20_000
