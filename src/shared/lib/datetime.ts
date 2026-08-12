/**
 * Target wire format for every datetime field returned by backend services.
 * {@link parseApiDateTime} also accepts legacy shapes until all services emit `Z`.
 *
 * @example "2026-08-12T15:06:00Z"
 */
export type ApiDateTime = string

/**
 * Wire format for date-only buckets (usage daily timeline).
 *
 * @example "2026-08-12"
 */
export type ApiDate = string

/** Target: `YYYY-MM-DDTHH:mm:ssZ`, optional fractional seconds. */
const API_DATETIME_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/

const API_DATE = /^\d{4}-\d{2}-\d{2}$/

const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i

const NAIVE_DATETIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?$/

function warnDev(message: string): void {
  if (import.meta.env.DEV) console.warn(`[datetime] ${message}`)
}

/**
 * Normalises legacy API timestamps to UTC `...Z`. Stored values are UTC; naive
 * strings from older services must not be parsed as browser-local time.
 */
export function normalizeApiDateTime(value: string): string {
  const trimmed = value.trim()

  if (API_DATETIME_Z.test(trimmed)) return trimmed

  if (HAS_OFFSET.test(trimmed)) {
    return trimmed.replace(/\+00:00$/, 'Z')
  }

  if (NAIVE_DATETIME.test(trimmed)) {
    const iso = trimmed.replace(' ', 'T')
    return iso.endsWith('Z') ? iso : `${iso}Z`
  }

  return trimmed
}

/**
 * Parses an API timestamp as UTC, then callers format it in the visitor's time
 * zone. Legacy naive and `+00:00` shapes are normalised until the backend
 * standardises on trailing `Z`.
 */
export function parseApiDateTime(value: string): Date {
  const normalized = normalizeApiDateTime(value)

  if (import.meta.env.DEV && !API_DATETIME_Z.test(normalized) && normalized === value.trim()) {
    warnDev(`Unrecognised datetime (expected UTC ending with Z): ${value}`)
  }

  return new Date(normalized)
}

/** Parses a calendar date from usage daily buckets (`YYYY-MM-DD`). */
export function parseApiCalendarDate(value: string): Date {
  if (!API_DATE.test(value)) {
    warnDev(`Expected YYYY-MM-DD, got: ${value}`)
  }
  return new Date(`${value}T00:00:00Z`)
}

/** Milliseconds from now until `value`; negative once it has passed. */
export function millisecondsUntil(value: string, now: number = Date.now()): number {
  return parseApiDateTime(value).getTime() - now
}
