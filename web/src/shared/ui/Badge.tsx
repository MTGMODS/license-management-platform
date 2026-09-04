import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

type BadgeTone = 'neutral' | 'accent' | 'positive' | 'caution' | 'negative'

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-white/8 bg-ink-800 text-fg-muted',
  accent: 'border-accent-500/25 bg-accent-500/10 text-accent-300',
  positive: 'border-positive/25 bg-positive/10 text-positive',
  caution: 'border-caution/25 bg-caution/10 text-caution',
  negative: 'border-negative/25 bg-negative/10 text-negative',
}

interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
