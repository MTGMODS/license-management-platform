import { serviceUrl } from '../config'
import { request } from '../http'

import type { TokenResponse, User } from './types'

export type OAuthProvider = 'discord' | 'telegram'

/**
 * Entry point of the provider OAuth flow. The browser navigates here (in a
 * popup on desktop); the backend redirects onward to Discord/Telegram and
 * generates its own CSRF `state`, so no parameters are supplied by the client.
 */
export function oauthLoginUrl(provider: OAuthProvider): string {
  return serviceUrl('user', `/auth/${provider}/login`)
}

export function getCurrentUser(signal?: AbortSignal): Promise<User> {
  return request<User>({ service: 'user', path: '/me', auth: true, signal })
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

export type { TokenResponse, User, UserRole, UserStatus } from './types'
