import { serviceOrigin } from '@/shared/api'
import { oauthLoginUrl, type OAuthProvider, type TokenResponse } from '@/shared/api/user'

/**
 * Contract with the backend OAuth callback.
 *
 * The callback must render a page that posts one of these messages to its
 * opener and then closes. A JSON body cannot work here: the popup lives on the
 * API origin, so the parent window is forbidden from reading its contents.
 *
 *   window.opener.postMessage(
 *     { type: 'mtg_auth_success', payload: <TokenResponse> },
 *     '<site origin>',
 *   )
 *
 *   window.opener.postMessage(
 *     { type: 'mtg_auth_error', error_code: 'USER_BANNED', message: '...' },
 *     '<site origin>',
 *   )
 *
 * The target origin must be explicit rather than '*', otherwise any page that
 * can reach the popup could read the tokens.
 */
const SUCCESS_TYPE = 'mtg_auth_success'
const ERROR_TYPE = 'mtg_auth_error'

const POPUP_FEATURES = 'popup=yes,width=520,height=720,menubar=no,toolbar=no,location=no'
const CLOSE_POLL_INTERVAL_MS = 400

export type AuthPopupFailure = 'blocked' | 'closed' | 'failed'

export class AuthPopupError extends Error {
  readonly reason: AuthPopupFailure
  readonly code: string | null

  constructor(reason: AuthPopupFailure, code: string | null = null) {
    super(`OAuth popup ${reason}`)
    this.name = 'AuthPopupError'
    this.reason = reason
    this.code = code
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readTokenResponse(payload: unknown): TokenResponse | null {
  if (!isRecord(payload)) return null
  const { access_token, refresh_token, user } = payload
  if (typeof access_token !== 'string' || typeof refresh_token !== 'string') return null
  if (!isRecord(user)) return null
  return payload as unknown as TokenResponse
}

/**
 * Opens the provider flow in a popup and resolves once the callback posts the
 * tokens back. Rejects if the browser blocked the popup, the user closed it,
 * or the backend reported a failure.
 */
export function openAuthPopup(provider: OAuthProvider): Promise<TokenResponse> {
  const expectedOrigin = serviceOrigin('user')

  const opened = window.open(oauthLoginUrl(provider), 'mtg-oauth', POPUP_FEATURES)

  if (!opened) {
    return Promise.reject(new AuthPopupError('blocked'))
  }

  const popup: Window = opened

  return new Promise<TokenResponse>((resolve, reject) => {
    let settled = false

    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      window.clearInterval(closeTimer)
    }

    const settle = (action: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      action()
    }

    function onMessage(event: MessageEvent) {
      // Anything from another origin is untrusted: tokens must only ever be
      // accepted from the API that issued them.
      if (event.origin !== expectedOrigin) return
      if (!isRecord(event.data)) return

      const { type } = event.data

      if (type === SUCCESS_TYPE) {
        const tokens = readTokenResponse(event.data.payload)
        settle(() => {
          popup.close()
          if (tokens) {
            resolve(tokens)
          } else {
            reject(new AuthPopupError('failed'))
          }
        })
        return
      }

      if (type === ERROR_TYPE) {
        const code = typeof event.data.error_code === 'string' ? event.data.error_code : null
        settle(() => {
          popup.close()
          reject(new AuthPopupError('failed', code))
        })
      }
    }

    // `closed` is one of the few cross-origin properties still readable, so
    // polling is the only way to notice a user dismissing the window.
    const closeTimer = window.setInterval(() => {
      if (popup.closed) {
        settle(() => {
          reject(new AuthPopupError('closed'))
        })
      }
    }, CLOSE_POLL_INTERVAL_MS)

    window.addEventListener('message', onMessage)
  })
}
