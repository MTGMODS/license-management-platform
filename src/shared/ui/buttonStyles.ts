import { cn } from '@/shared/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline'

export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'relative inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium ' +
  'whitespace-nowrap transition-[background-color,border-color,box-shadow,transform,opacity] ' +
  'duration-200 ease-out-soft active:translate-y-px ' +
  'disabled:pointer-events-none disabled:opacity-45'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-500 text-white shadow-[0_8px_24px_-10px_var(--color-accent-500)] ' +
    'hover:bg-accent-400 hover:shadow-[0_10px_32px_-8px_var(--color-accent-500)]',
  secondary: 'bg-ink-750 text-fg bevel hover:bg-ink-700',
  ghost: 'text-fg-muted hover:bg-ink-800 hover:text-fg',
  outline: 'border border-ink-600 text-fg hover:border-accent-500/50 hover:bg-ink-850',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
}

export function buttonStyles(options?: {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}): string {
  const { variant = 'primary', size = 'md', fullWidth = false, className } = options ?? {}
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)
}
