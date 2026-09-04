import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react'
import { flushSync } from 'react-dom'

import {
  claimAnalyticsTooltip,
  registerAnalyticsTooltipSurface,
  releaseAnalyticsTooltip,
  subscribeAnalyticsTooltip,
  useAnalyticsTooltipSuppressed,
} from './analyticsTooltipCoordinator'
import { useCoarsePointer } from './useCoarsePointer'

type SurfaceProps = Pick<
  HTMLAttributes<HTMLElement>,
  'onPointerEnter' | 'onPointerLeave' | 'onPointerDownCapture'
>

/** One visible analytics tooltip at a time across charts and the world map. */
export function useExclusiveAnalyticsTooltip() {
  const id = useId()
  const coarse = useCoarsePointer()
  const suppressed = useAnalyticsTooltipSuppressed(id)
  const pinnedRef = useRef(false)
  const [forceClose, setForceClose] = useState(false)

  const claim = useCallback(() => claimAnalyticsTooltip(id), [id])
  const release = useCallback(() => releaseAnalyticsTooltip(id), [id])

  const pin = useCallback(() => {
    pinnedRef.current = true
  }, [])

  const dismiss = useCallback(() => {
    pinnedRef.current = false
    setForceClose(true)
    release()
  }, [release])

  const surfaceRef = useCallback(
    (node: HTMLElement | null) => {
      registerAnalyticsTooltipSurface(id, node)
    },
    [id],
  )

  useEffect(() => {
    return subscribeAnalyticsTooltip((owner) => {
      if (owner === id) {
        setForceClose(false)
        return
      }

      if (!pinnedRef.current) return
      pinnedRef.current = false
      setForceClose(true)
    })
  }, [id])

  const surfaceProps: SurfaceProps = coarse
    ? {
        /** Capture phase: claim before Recharts sees pointerdown on a suppressed chart. */
        onPointerDownCapture: () => {
          flushSync(() => {
            setForceClose(false)
            claim()
          })
        },
      }
    : {
        onPointerEnter: claim,
        onPointerLeave: release,
      }

  const tooltipActive = coarse
    ? forceClose
      ? false
      : undefined
    : suppressed
      ? false
      : undefined

  return {
    id,
    coarse,
    suppressed,
    claim,
    release,
    dismiss,
    pin,
    surfaceRef,
    tooltipActive,
    /** Recharts: tap-to-toggle on touch, hover on desktop. */
    trigger: coarse ? ('click' as const) : ('hover' as const),
    surfaceProps,
  }
}
