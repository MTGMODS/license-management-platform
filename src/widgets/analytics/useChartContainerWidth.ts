import { useLayoutEffect, useState, type RefObject } from 'react'

/** Tracks the pixel width of a chart container for mobile tooltip placement. */
export function useChartContainerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    const update = () => setWidth(node.clientWidth)
    update()

    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])

  return width
}
