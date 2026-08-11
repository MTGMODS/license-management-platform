/**
 * The backend emits three different error envelopes:
 *
 *  1. `DomainException`      → { error_code, message, timestamp, path }
 *  2. `HTTPException`        → { detail: string }          (JWT, OAuth, bot auth)
 *  3. Validation             → { error_code: "VALIDATION_ERROR", message, ... }
 *
 * `ApiError` flattens all of them so callers never branch on wire shape, and
 * `apiErrorTranslationKey` maps the result onto a user-facing message. Raw
 * backend strings are never rendered.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | null
  readonly payload: unknown

  constructor(params: { status: number; code: string | null; message: string; payload?: unknown }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.code = params.code
    this.payload = params.payload ?? null
  }
}

/** Raised when the request never reached the server (offline, DNS, CORS). */
export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

/** Raised when the request exceeded the client timeout or was aborted. */
export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Extracts `{ code, message }` from any of the backend error envelopes. */
export function parseErrorPayload(payload: unknown): { code: string | null; message: string } {
  if (!isRecord(payload)) {
    return { code: null, message: 'Request failed' }
  }

  const code = typeof payload.error_code === 'string' ? payload.error_code : null

  if (typeof payload.message === 'string') {
    return { code, message: payload.message }
  }

  const { detail } = payload

  if (typeof detail === 'string') {
    return { code, message: detail }
  }

  // FastAPI's default validation envelope: detail is an array of issues.
  if (Array.isArray(detail)) {
    const first = detail.find((item) => isRecord(item) && typeof item.msg === 'string')
    if (isRecord(first) && typeof first.msg === 'string') {
      return { code: code ?? 'VALIDATION_ERROR', message: first.msg }
    }
    return { code: code ?? 'VALIDATION_ERROR', message: 'Validation failed' }
  }

  return { code, message: 'Request failed' }
}

/**
 * Error codes the backend can return that have a dedicated translation.
 * Anything outside this set degrades to a generic message by status, so a new
 * backend code shows a sane sentence rather than an untranslated key.
 */
const TRANSLATED_CODES = new Set([
  'INVALID_KEY',
  'ACTIVE_LICENSE_EXISTS',
  'NO_ACTIVE_LICENSE',
  'FILE_GENERATION_FAILED',
  'ACCESS_DENIED',
  'HWID_LIMIT_REACHED',
  'RESET_LIMIT_REACHED',
  'USER_BANNED',
  'USER_DELETED',
  'USER_NOT_FOUND',
  'ALREADY_LINKED',
  'FILE_NOT_FOUND',
  'VALIDATION_ERROR',
])

/** Maps any thrown error onto a key in the `errors` translation namespace. */
export function apiErrorTranslationKey(error: unknown): string {
  if (error instanceof TimeoutError) return 'errors:timeout'
  if (error instanceof NetworkError) return 'errors:network'

  if (error instanceof ApiError) {
    if (error.code && TRANSLATED_CODES.has(error.code)) {
      return `errors:code.${error.code}`
    }

    switch (error.status) {
      case 401:
        return 'errors:unauthorized'
      case 403:
        return 'errors:forbidden'
      case 404:
        return 'errors:notFound'
      case 422:
        return 'errors:validation'
      default:
        return 'errors:unexpected'
    }
  }

  return 'errors:unexpected'
}
