import type { ComponentType } from 'react'

import { cn } from '@/shared/lib/cn'

export interface SegmentedOption<T extends string | number> {
  id: T
  label: string
  icon?: ComponentType<{ className?: string }>
}

interface SegmentedControlProps<T extends string | number> {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  /** Names the group for screen readers, since the buttons alone lack context. */
  label: string
  size?: 'sm' | 'md'
  className?: string
}

export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex max-w-full shrink-0 overflow-x-auto rounded-xl bg-ink-800 p-1 ring-1 ring-white/5',
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon
        const active = option.id === value

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg font-medium transition-colors duration-200',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
              active ? 'bg-ink-700 text-fg' : 'text-fg-subtle hover:text-fg-muted',
            )}
          >
            {Icon ? <Icon aria-hidden className="size-4" /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
