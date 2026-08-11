import { REQUEST_TIMEOUT_MS, serviceUrl, type ServiceName } from './config'
import { ApiError, NetworkError, TimeoutError, parseErrorPayload } from './errors'
import { clearTokens, getTokens, setTokens } from './tokens'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export type QueryValue = string | number | boolean | null | undefined

export interface RequestConfig {
  service: ServiceName
  path: string
  method?: HttpMethod
  query?: Record<string, QueryValue>
  body?: unknown
  /** Attach the bearer token and refresh it once on a 401. */
  auth?: boolean
  signal?: AbortSignal
  responseType?: 'json' | 'blob' | 'void'
}

function buildUrl(service: ServiceName, path: string, query?: Record<string, QueryValue>): string {
  const url = serviceUrl(service, path)
  if (!query) return url

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    // Omitted params let the backend apply its own defaults.
    if (value === null || value === undefined || value === '') continue
    search.append(key, String(value))
  }

  const qs = search.toString()
  return qs ? `${url}?${qs}` : url
}

function combineSignals(signals: AbortSignal[]): AbortSignal | undefined {
  const present = signals.filter(Boolean)
  if (present.length === 0) return undefined
  if (present.length === 1) return present[0]
  // Older embedded webviews (notably Android WebView inside Telegram) may not
  // implement AbortSignal.any; the timeout signal alone is an acceptable
  // degradation there.
  return typeof AbortSignal.any === 'function' ? AbortSignal.any(present) : present[0]
}

async function readPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null)
  }
  return response.text().catch(() => null)
}

let refreshPromise: Promise<boolean> | null = null

async function performRefresh(): Promise<boolean> {
  const tokens = getTokens()
  if (!tokens) return false

  try {
    const response = await fetch(serviceUrl('user', '/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refreshToken }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      clearTokens()
      return false
    }

    const payload = (await response.json()) as { access_token?: string; refresh_token?: string }

    if (!payload.access_token || !payload.refresh_token) {
      clearTokens()
      return false
    }

    setTokens({ accessToken: payload.access_token, refreshToken: payload.refresh_token })
    return true
  } catch {
    // A network blip should not destroy the session; only an explicit
    // rejection from the server does.
    return false
  }
}

/** Refreshes at most once concurrently, so a burst of 401s makes one call. */
function refreshSession(): Promise<boolean> {
  refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

async function executeRequest(config: RequestConfig, accessToken: string | null): Promise<Response> {
  const { service, path, method = 'GET', query, body, signal } = config

  const headers: Record<string, string> = { Accept: 'application/json' }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)

  try {
    return await fetch(buildUrl(service, path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: combineSignals(signal ? [signal, timeoutSignal] : [timeoutSignal]),
    })
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw signal?.aborted ? error : new TimeoutError()
    }
    throw new NetworkError()
  }
}

export async function request<T>(config: RequestConfig): Promise<T> {
  const { auth = false, responseType = 'json' } = config

  let response = await executeRequest(config, auth ? (getTokens()?.accessToken ?? null) : null)

  // Access tokens live 15 minutes, so an expired token during a session is the
  // common case rather than an edge case.
  if (response.status === 401 && auth && getTokens()) {
    const refreshed = await refreshSession()
    if (refreshed) {
      response = await executeRequest(config, getTokens()?.accessToken ?? null)
    } else {
      clearTokens()
    }
  }

  if (!response.ok) {
    const payload = await readPayload(response)
    const { code, message } = parseErrorPayload(payload)
    throw new ApiError({ status: response.status, code, message, payload })
  }

  if (responseType === 'void' || response.status === 204) {
    return undefined as T
  }

  if (responseType === 'blob') {
    return (await response.blob()) as T
  }

  return (await response.json()) as T
}
