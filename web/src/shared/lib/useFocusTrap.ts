import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableIn(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (node) => node.getAttribute('aria-hidden') !== 'true' && node.tabIndex !== -1,
  )
}

/**
 * Keeps Tab cycling inside a modal and restores focus when it unmounts.
 * Escape is optional so callers can dismiss without a second listener.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  { onEscape }: { onEscape?: () => void } = {},
): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const initial = focusableIn(container)[0] ?? container
    initial.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape?.()
        return
      }

      if (event.key !== 'Tab') return

      const items = focusableIn(container)
      if (items.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      const inside = current instanceof Node && container.contains(current)

      if (event.shiftKey) {
        if (!inside || current === first) {
          event.preventDefault()
          last?.focus()
        }
        return
      }

      if (!inside || current === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [containerRef, onEscape])
}
