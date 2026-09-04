import { useEffect, useRef, useState, type ReactNode } from 'react'

interface DeferredMountProps {
  children: ReactNode
  /** Shown in place of the content, and used to reserve scroll height. */
  fallback: ReactNode
  /** How far ahead of the viewport to start loading. */
  rootMargin?: string
}

/**
 * Mounts its children the first time they approach the viewport.
 *
 * `React.lazy` alone is not enough: Suspense resolves as soon as the element
 * renders, so a below-the-fold chunk downloads on page load regardless. Many
 * visitors never scroll as far as the analytics, and this keeps them from
 * paying for it.
 */
export function DeferredMount({ children, fallback, rootMargin = '400px' }: DeferredMountProps) {
  const anchor = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return

    const node = anchor.current
    if (!node) return

    // Without IntersectionObserver the content is simply rendered rather than
    // hidden behind a feature check.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [visible, rootMargin])

  return <div ref={anchor}>{visible ? children : fallback}</div>
}
