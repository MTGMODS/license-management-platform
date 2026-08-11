import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Intl formatters are costly to construct, and the analytics section renders
 * thousands of numbers across its charts, so they are built once per locale
 * and shared.
 */
export function useFormatters() {
  const { i18n } = useTranslation()
  const locale = i18n.language

  return useMemo(() => {
    const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
    const compact = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    })
    const decimal = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })
    const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
    const fullDate = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
    const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' })
    const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })

    // 2024-01-07 was a Sunday, matching the payload's index 0, so day names are
    // derived from the locale instead of being duplicated in every catalogue.
    const weekdayDate = (index: number) => new Date(Date.UTC(2024, 0, 7 + index))

    return {
      locale,
      /** Thousands-separated whole number. */
      number: (value: number) => integer.format(value),
      /** Short form for axis ticks and tight cards, e.g. 1,3 млн. */
      compact: (value: number) => compact.format(value),
      /** Already on a 0-100 scale in the payload, so it is not divided again. */
      percent: (value: number) => `${decimal.format(value)}%`,
      decimal: (value: number) => decimal.format(value),
      /** Parses the payload's `YYYY-MM-DD` as a calendar date, not local time. */
      dayMonth: (isoDate: string) => dayMonth.format(new Date(`${isoDate}T00:00:00Z`)),
      fullDate: (isoDate: string) => fullDate.format(new Date(`${isoDate}T00:00:00Z`)),
      dateTime: (iso: string) => dateTime.format(new Date(iso)),
      hour: (hour: number) => `${String(hour).padStart(2, '0')}:00`,
      /** Index 0 is Sunday, matching the payload's PostgreSQL `dow` values. */
      weekday: (index: number) => weekdayLong.format(weekdayDate(index)),
      weekdayShort: (index: number) => weekdayShort.format(weekdayDate(index)),
    }
  }, [locale])
}

export type Formatters = ReturnType<typeof useFormatters>
