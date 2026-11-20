import { useSyncExternalStore } from 'react'

/** Below this point the sidebar is a drawer or, with the tabs, a page: the same `md` as `theme.css` (860px). */
export const NARROW = '(width < 860px)'
/** A finger, not a mouse: row swiping and the 44px sizes apply here. */
export const COARSE = '(pointer: coarse)'

/**
 * True if the media query holds now, and updates when it changes. Without `matchMedia` (tests in jsdom, server-side
 * rendering) it is always false: the usual version is drawn, the one for a wide window and a mouse.
 */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
      const media = window.matchMedia(query)
      media.addEventListener('change', notify)
      return () => media.removeEventListener('change', notify)
    },
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}

/** Phone: narrow screen and finger. This is where swipeable rows and capture from the «+» apply. */
export function usePhone(): boolean {
  const narrow = useMedia(NARROW)
  const coarse = useMedia(COARSE)
  return narrow && coarse
}
