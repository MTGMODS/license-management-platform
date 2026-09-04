import { useSyncExternalStore } from 'react'

type Listener = (activeId: string | null) => void

let activeId: string | null = null
const listeners = new Set<Listener>()
const surfaces = new Map<string, HTMLElement>()
let documentListenerAttached = false

function emit() {
  listeners.forEach((listener) => listener(activeId))
}

function ensureDocumentDismissListener() {
  if (documentListenerAttached || typeof document === 'undefined') return
  documentListenerAttached = true

  document.addEventListener('pointerdown', (event) => {
    if (activeId == null) return
    if (isPointerInsideAnalyticsSurface(event.target as Node)) return
    dismissAnalyticsTooltip()
  }, true)
}

/** Tracks chart/map containers so outside taps can dismiss the active tooltip. */
export function registerAnalyticsTooltipSurface(id: string, element: HTMLElement | null) {
  if (element) {
    surfaces.set(id, element)
    ensureDocumentDismissListener()
    return
  }

  surfaces.delete(id)
}

export function isPointerInsideAnalyticsSurface(target: Node | null): boolean {
  if (target == null) return false

  for (const element of surfaces.values()) {
    if (element.contains(target)) return true
  }

  return false
}

/** Marks one analytics surface as owning the only visible tooltip. */
export function claimAnalyticsTooltip(id: string) {
  if (activeId === id) return
  activeId = id
  emit()
}

/** Clears ownership when the pointer leaves that surface. */
export function releaseAnalyticsTooltip(id: string) {
  if (activeId !== id) return
  activeId = null
  emit()
}

/** Tap/click outside every analytics chart and the map. */
export function dismissAnalyticsTooltip() {
  if (activeId == null) return
  activeId = null
  emit()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  listener(activeId)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return activeId
}

/** True when another chart/map already owns the shared tooltip slot. */
export function useAnalyticsTooltipSuppressed(id: string): boolean {
  const owner = useSyncExternalStore(subscribe, getSnapshot, () => null)
  return owner !== null && owner !== id
}

/** Hide local overlays when a different analytics tooltip takes over. */
export function subscribeAnalyticsTooltip(listener: Listener) {
  listeners.add(listener)
  listener(activeId)
  return () => {
    listeners.delete(listener)
  }
}
