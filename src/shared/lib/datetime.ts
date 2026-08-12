/**
 * Wire format for every datetime field returned by backend services.
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

/** `YYYY-MM-DDTHH:mm:ssZ`, optional fractional seconds. */
const API_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/

const API_DATE = /^\d{4}-\d{2}-\d{2}$/

function warnDev(message: string): void {
  if (import.meta.env.DEV) console.warn(`[datetime] ${message}`)
}

/**
 * Parses an API timestamp. Services emit UTC with a trailing `Z`.
 * Display formatters convert to the visitor's local time zone.
 */
export function parseApiDateTime(value: string): Date {
  if (!API_DATETIME.test(value)) {
    warnDev(`Expected UTC ISO with trailing Z (e.g. 2026-08-12T15:06:00Z), got: ${value}`)
  }
  return new Date(value)
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
