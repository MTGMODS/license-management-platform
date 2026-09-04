import { useState } from 'react'

import { cn } from '@/shared/lib/cn'

interface AvatarProps {
  src?: string | null
  name: string
  className?: string
}

function initials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return [...trimmed][0]!.toUpperCase()
}

export function Avatar({ src, name, className }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <span
      className={cn(
        'relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full',
        'bg-ink-700 text-xs font-semibold text-fg-muted ring-1 ring-white/10',
        className,
      )}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          // Discord CDN links rot when a user changes their avatar, so fall
          // back to initials instead of rendering a broken image.
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  )
}
