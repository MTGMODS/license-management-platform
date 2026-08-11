import { cn } from '@/shared/lib/cn'

interface SkeletonProps {
  className?: string
  /** Announce as a loading region for assistive tech. */
  label?: string
}

export function Skeleton({ className, label }: SkeletonProps) {
  return (
    <div
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'relative overflow-hidden rounded-lg bg-ink-800',
        // A travelling highlight reads as "loading" without the harsh flicker
        // of an opacity pulse on a dark surface.
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-linear-to-r after:from-transparent after:via-white/6 after:to-transparent',
        'motion-reduce:after:hidden',
        className,
      )}
    />
  )
}
