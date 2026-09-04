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

/** Today's UTC calendar day (`YYYY-MM-DD`), matching backend daily buckets. */
export function utcTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** UTC calendar day for an API timestamp, matching backend daily buckets. */
export function utcCalendarDayKey(iso: string): string {
  return parseApiDateTime(iso).toISOString().slice(0, 10)
}

/** Milliseconds from now until `value`; negative once it has passed. */
export function millisecondsUntil(value: string, now: number = Date.now()): number {
  return parseApiDateTime(value).getTime() - now
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export type RemainingUnit = 'days' | 'hours' | 'minutes' | 'seconds'

/**
 * Largest whole unit still left. Under 24 hours this never reports days,
 * so a leftover of 20 hours is hours, not "0 days".
 */
export function remainingTimeParts(ms: number): { count: number; unit: RemainingUnit } | null {
  if (ms <= 0) return null
  if (ms >= DAY) return { count: Math.floor(ms / DAY), unit: 'days' }
  if (ms >= HOUR) return { count: Math.floor(ms / HOUR), unit: 'hours' }
  if (ms >= MINUTE) return { count: Math.floor(ms / MINUTE), unit: 'minutes' }
  return { count: Math.max(1, Math.floor(ms / SECOND)), unit: 'seconds' }
}

/** How often the remaining-time label should refresh, if at all. */
export function remainingTickMs(ms: number): number | null {
  if (ms <= 0) return null
  if (ms < MINUTE) return SECOND
  if (ms < HOUR) return 15 * SECOND
  if (ms < DAY) return 60 * SECOND
  return null
}
