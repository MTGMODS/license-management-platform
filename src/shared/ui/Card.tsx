import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds an accent glow on hover; use for interactive cards only. */
  interactive?: boolean
  children?: ReactNode
}

export function Card({ interactive = false, className, children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        'glass bevel rounded-card border border-white/5 p-5',
        interactive &&
          'transition-[border-color,transform,box-shadow] duration-300 ease-out-soft ' +
            'hover:-translate-y-0.5 hover:border-accent-500/30 hover:glow-accent',
        className,
      )}
    >
      {children}
    </div>
  )
}
