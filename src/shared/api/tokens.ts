export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

const ACCESS_KEY = 'mtg.auth.access'
const REFRESH_KEY = 'mtg.auth.refresh'

/**
 * The backend hands tokens back in a JSON body rather than an httpOnly cookie,
 * so the client has to hold them itself. localStorage is used because the
 * Telegram Mini App webview reloads aggressively and in-memory state would not
 * survive. It falls back to memory when storage is unavailable (private mode,
 * embedded webviews with storage disabled).
 */
let memoryTokens: AuthTokens | null = null
let storageAvailable = true

function readKey(key: string): string | null {
  if (!storageAvailable) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    storageAvailable = false
    return null
  }
}

function writeKey(key: string, value: string): void {
  if (!storageAvailable) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    storageAvailable = false
  }
}

function removeKey(key: string): void {
  if (!storageAvailable) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    storageAvailable = false
  }
}

export function getTokens(): AuthTokens | null {
  const accessToken = readKey(ACCESS_KEY)
  const refreshToken = readKey(REFRESH_KEY)

  if (accessToken && refreshToken) {
    return { accessToken, refreshToken }
  }

  return memoryTokens
}

export function setTokens(tokens: AuthTokens): void {
  memoryTokens = tokens
  writeKey(ACCESS_KEY, tokens.accessToken)
  writeKey(REFRESH_KEY, tokens.refreshToken)
}

export function clearTokens(): void {
  memoryTokens = null
  removeKey(ACCESS_KEY)
  removeKey(REFRESH_KEY)
  for (const listener of sessionExpiredListeners) listener()
}

const sessionExpiredListeners = new Set<() => void>()

/**
 * Notifies subscribers that the session ended irrecoverably. Lets the HTTP
 * layer signal the auth store without importing it, which would be a cycle.
 */
export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener)
  return () => {
    sessionExpiredListeners.delete(listener)
  }
}
