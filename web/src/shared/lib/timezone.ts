import type { HourActivityPoint } from '@/shared/api/usage'

/** Browser offset from UTC in whole hours (positive east of Greenwich). */
export function browserUtcOffsetHours(date: Date = new Date()): number {
  return -date.getTimezoneOffset() / 60
}

/**
 * Re-buckets UTC hourly aggregates into the visitor's local time zone.
 * The backend only exposes 0–23 UTC bins, so this is an approximation when
 * launches near midnight spill across calendar days.
 */
export function shiftHourlyToLocal(hourly: HourActivityPoint[]): HourActivityPoint[] {
  const offset = browserUtcOffsetHours()
  const buckets: HourActivityPoint[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    users: 0,
    launches: 0,
    launches_per_user: 0,
  }))

  for (const point of hourly) {
    const localHour = ((point.hour + offset) % 24 + 24) % 24
    const bucket = buckets[localHour]!
    bucket.users = point.users
    bucket.launches = point.launches
    bucket.launches_per_user = point.launches_per_user
  }

  return buckets
}
