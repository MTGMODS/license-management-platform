import { serviceUrl } from '../config'
import { request } from '../http'

import type { TokenResponse, User } from './types'

export type OAuthProvider = 'discord' | 'telegram'

/**
 * OAuth must hit the user service host directly in local dev.
 * Going through the Vite proxy would set `oauth_state` on `localhost`, while
 * Discord/Telegram redirect back to `127.0.0.1:8001` — cookies would not
 * match and the callback would return an auth error HTML (HTTP 200).
 */
function oauthServiceRoot(): string | null {
  const absolute = import.meta.env.VITE_USER_API_URL
  if (typeof absolute === 'string' && absolute) {
    return absolute.replace(/\/+$/, '')
  }

  const direct = import.meta.env.VITE_DEV_USER_TARGET
  if (typeof direct === 'string' && direct) {
    // Direct service mounts under /api/v1/... (gateway strips /api).
    return `${direct.replace(/\/+$/, '')}/api`
  }

  return null
}

/**
 * Entry point of the provider OAuth flow. Always absolute so a blank popup
 * can navigate here (relative URLs would resolve against about:blank).
 */
export function oauthLoginUrl(provider: OAuthProvider): string {
  const suffix = `/v1/users/auth/${provider}/login`
  const root = oauthServiceRoot()
  if (root) return `${root}${suffix}`

  const path = serviceUrl('user', `/auth/${provider}/login`)
  if (/^https?:\/\//i.test(path)) return path
  return new URL(path, window.location.origin).href
}

export function getCurrentUser(signal?: AbortSignal): Promise<User> {
  return request<User>({ service: 'user', path: '/me', auth: true, signal })
}

/** Soft-deletes the signed-in account and clears social links server-side. */
export function deleteMyAccount(signal?: AbortSignal): Promise<{ detail: string }> {
  return request<{ detail: string }>({
    service: 'user',
    path: '/me',
    method: 'DELETE',
    auth: true,
    signal,
  })
}

/**
 * Telegram Mini App sign-in. `initData` is the raw query-string blob from
 * `Telegram.WebApp.initData`; the backend verifies its HMAC against the bot
 * token, so it must be forwarded verbatim.
 */
export function authenticateWithTelegramInitData(initData: string): Promise<TokenResponse> {
  return request<TokenResponse>({
    service: 'user',
    path: '/auth/telegram/webapp',
    method: 'POST',
    body: { init_data: initData },
  })
}

/** Consumes a one-time ticket from the OAuth callback HTML fallback. */
export function consumeOAuthHandoff(ticket: string, signal?: AbortSignal): Promise<unknown> {
  return request<unknown>({
    service: 'user',
    path: `/auth/handoff/${encodeURIComponent(ticket)}`,
    signal,
  })
}

export type { TokenResponse, User, UserRole, UserStatus } from './types'
