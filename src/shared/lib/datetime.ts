/** Matches a trailing `Z` or a `+03:00` / `-0300` style offset. */
const HAS_TIMEZONE = /(?:Z|[+-]\d{2}:?\d{2})$/

/**
 * Parses a timestamp from the API, treating a missing offset as UTC.
 *
 * The services disagree: usage and the licence statistics send offset-aware
 * values like `2026-08-11T17:25:44+00:00`, while `users/me` and `license/info`
 * send naive ones like `2026-07-23T10:07:03`. JavaScript reads the naive form
 * as *local* time, so a visitor in UTC+3 sees every such timestamp shifted by
 * three hours, and each visitor sees a different figure. The stored values are
 * UTC, so the offset is supplied when the string omits it.
 */
export function parseApiDate(value: string): Date {
  return new Date(HAS_TIMEZONE.test(value) ? value : `${value}Z`)
}

/** Milliseconds from now until `value`; negative once it has passed. */
export function millisecondsUntil(value: string, now: number = Date.now()): number {
  return parseApiDate(value).getTime() - now
}
