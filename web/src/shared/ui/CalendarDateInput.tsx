import { CalendarDays } from 'lucide-react'
import { useRef } from 'react'

import { isCalendarDate } from '@/shared/lib/datetime'

export function CalendarDateInput({ label, calendarLabel, value, onChange, min, max }: {
  label: string
  calendarLabel: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
}) {
  const picker = useRef<HTMLInputElement>(null)
  const display = isCalendarDate(value) ? value.split('-').reverse().join('/') : value

  function edit(text: string) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
    const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : text
    onChange(isCalendarDate(iso) ? iso : text)
  }

  return (
    <span className="relative inline-flex w-full min-w-0 sm:w-[8.5rem]">
      <input
        type="text" aria-label={label} placeholder="dd/mm/yyyy" inputMode="numeric" maxLength={10}
        value={display} onChange={event => edit(event.target.value)}
        className="w-full min-w-0 rounded-lg border border-white/8 bg-ink-800 py-2 pl-2.5 pr-8 text-sm tabular text-fg outline-none focus:border-accent-500/40"
      />
      <input
        ref={picker} type="date" aria-hidden tabIndex={-1}
        value={isCalendarDate(value) ? value : ''}
        min={min && isCalendarDate(min) ? min : undefined}
        max={max && isCalendarDate(max) ? max : undefined}
        onChange={event => onChange(event.target.value)}
        className="pointer-events-none absolute bottom-0 left-0 size-px opacity-0 [color-scheme:dark]"
      />
      <button type="button" aria-label={calendarLabel}
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-r-lg text-fg-muted hover:text-fg focus-visible:outline focus-visible:outline-accent-400"
        onClick={() => {
          const input = picker.current
          if (!input) return
          if (input.showPicker) input.showPicker()
          else input.click()
        }}>
        <CalendarDays aria-hidden className="size-4" />
      </button>
    </span>
  )
}
