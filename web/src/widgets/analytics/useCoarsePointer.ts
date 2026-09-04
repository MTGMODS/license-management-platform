import { useSyncExternalStore } from 'react'

/** Touch-first layouts: no hover and/or narrow viewport. */
const QUERY = '(hover: none), (pointer: coarse), (max-width: 767px)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

/** Phones/tablets: use tap tooltips instead of hover. */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
