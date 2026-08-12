/**
 * Shared OAuth result channel between `/auth/callback` and a waiting login tab.
 *
 * Used when the API callback could not close a real popup (COOP, or a blocked
 * "popup" that became a tab) and redirected to the SPA instead.
 */
export const AUTH_BROADCAST_CHANNEL = 'mtg_auth'

export const AUTH_SUCCESS_TYPE = 'mtg_auth_success'
export const AUTH_ERROR_TYPE = 'mtg_auth_error'

export type AuthBroadcastSuccess = {
  type: typeof AUTH_SUCCESS_TYPE
  payload: unknown
}

export type AuthBroadcastError = {
  type: typeof AUTH_ERROR_TYPE
  error_code?: string | null
  message?: string | null
}

export type AuthBroadcastMessage = AuthBroadcastSuccess | AuthBroadcastError

export function isAuthBroadcastMessage(value: unknown): value is AuthBroadcastMessage {
  if (typeof value !== 'object' || value === null) return false
  const type = (value as { type?: unknown }).type
  return type === AUTH_SUCCESS_TYPE || type === AUTH_ERROR_TYPE
}
