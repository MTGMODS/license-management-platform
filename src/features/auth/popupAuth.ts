import { serviceOrigin } from '@/shared/api'
import { oauthLoginUrl, type OAuthProvider, type TokenResponse } from '@/shared/api/user'

import {
  AUTH_BROADCAST_CHANNEL,
  AUTH_ERROR_TYPE,
  AUTH_SUCCESS_TYPE,
  isAuthBroadcastMessage,
} from './authChannel'

/**
 * Contract with the backend OAuth callback.
 *
 * Real popup (opener intact):
 *   window.opener.postMessage({ type, payload|error }, FRONTEND_ORIGIN)
 *   then window.close()
 *
 * If the provider's COOP nulls opener, the API may redirect the popup to
 * `/auth/callback?ticket=...` which relays via BroadcastChannel.
 *
 * Popups are opened as `about:blank` first, then navigated to the login URL,
 * so a blocked popup never hijacks the login tab.
 */
const POPUP_FEATURES = 'popup=yes,width=520,height=720,menubar=no,toolbar=no,location=no'
const CLOSE_POLL_INTERVAL_MS = 400
const CLOSE_GRACE_MS = 2500

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

export function readTokenResponse(payload: unknown): TokenResponse | null {
  if (!isRecord(payload)) return null
  const { access_token, refresh_token, user } = payload
  if (typeof access_token !== 'string' || typeof refresh_token !== 'string') return null
  if (!isRecord(user)) return null
  return payload as unknown as TokenResponse
}

/**
 * Cursor / VS Code Simple Browser — popups become blank tabs; show dialog instead.
 */
export function isEmbeddedBrowserWithoutPopups(): boolean {
  return /Electron/i.test(navigator.userAgent)
}

/**
 * Phones, tablets, and Chrome DevTools device emulation: use same-tab OAuth
 * instead of a popup (emulation makes window.open look like a blocked tab).
 */
export function shouldUseFullPageOAuth(): boolean {
  if (isEmbeddedBrowserWithoutPopups()) return false
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return true
  if (window.matchMedia('(max-width: 900px)').matches) return true
  return false
}

export function startFullPageOAuth(provider: OAuthProvider, options?: { ticket?: string }): void {
  window.location.assign(oauthLoginUrl(provider, options))
}

/**
 * Must run inside a user gesture. Returns null when popups are blocked or the
 * environment only opens a normal tab — callers show the dialog (desktop) or
 * should have used full-page OAuth (mobile) already.
 */
export function tryOpenAuthWindow(): Window | null {
  if (isEmbeddedBrowserWithoutPopups()) return null

  const opened = window.open('about:blank', 'mtg-oauth', POPUP_FEATURES)
  if (!opened || opened.closed) return null

  // Some browsers return a Window but still opened a tab the same size as us.
  if (isLikelyTabNotPopup(opened)) {
    try {
      opened.close()
    } catch {
      // ignore
    }
    return null
  }

  return opened
}

/** True when the opened window is a full browser tab, not a sized popup. */
function isLikelyTabNotPopup(win: Window): boolean {
  try {
    if (win.outerWidth === 0 && win.outerHeight === 0) return true

    const sameAsOpener =
      Math.abs(win.outerWidth - window.outerWidth) < 48 &&
      Math.abs(win.outerHeight - window.outerHeight) < 48
    if (sameAsOpener) return true

    const screenW = window.screen.availWidth || window.screen.width
    const screenH = window.screen.availHeight || window.screen.height
    if (win.outerWidth >= screenW * 0.85 && win.outerHeight >= screenH * 0.75) {
      return true
    }
  } catch {
    return true
  }
  return false
}

/**
 * Drives an already-opened blank popup through the OAuth login URL and waits
 * for the callback. Pass the window from `tryOpenAuthWindow()` so the open
 * stays tied to the click that unlocked the popup.
 */
export function openAuthPopup(
  provider: OAuthProvider,
  popup: Window,
  options?: { ticket?: string },
): Promise<TokenResponse> {
  const expectedOrigin = serviceOrigin('user')
  const loginUrl = oauthLoginUrl(provider, options)

  try {
    popup.location.assign(loginUrl)
  } catch {
    popup.location.href = loginUrl
  }

  return new Promise<TokenResponse>((resolve, reject) => {
    let settled = false
    let closeGraceTimer: number | undefined
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL)

    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      channel.close()
      window.clearInterval(closeTimer)
      if (closeGraceTimer !== undefined) window.clearTimeout(closeGraceTimer)
    }

    const settle = (action: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      action()
    }

    const acceptSuccess = (payload: unknown) => {
      const tokens = readTokenResponse(payload)
      settle(() => {
        try {
          popup.close()
        } catch {
          // ignore
        }
        if (tokens) resolve(tokens)
        else reject(new AuthPopupError('failed'))
      })
    }

    const acceptError = (code: string | null) => {
      settle(() => {
        try {
          popup.close()
        } catch {
          // ignore
        }
        reject(new AuthPopupError('failed', code))
      })
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== expectedOrigin) return
      if (!isRecord(event.data)) return

      const { type } = event.data

      if (type === AUTH_SUCCESS_TYPE) {
        acceptSuccess(event.data.payload)
        return
      }

      if (type === AUTH_ERROR_TYPE) {
        const code = typeof event.data.error_code === 'string' ? event.data.error_code : null
        acceptError(code)
      }
    }

    channel.onmessage = (event: MessageEvent) => {
      if (!isAuthBroadcastMessage(event.data)) return

      if (event.data.type === AUTH_SUCCESS_TYPE) {
        acceptSuccess(event.data.payload)
        return
      }

      const code = typeof event.data.error_code === 'string' ? event.data.error_code : null
      acceptError(code)
    }

    const closeTimer = window.setInterval(() => {
      if (!popup.closed) return
      window.clearInterval(closeTimer)
      closeGraceTimer = window.setTimeout(() => {
        settle(() => {
          reject(new AuthPopupError('closed'))
        })
      }, CLOSE_GRACE_MS)
    }, CLOSE_POLL_INTERVAL_MS)

    window.addEventListener('message', onMessage)
  })
}
