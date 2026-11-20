import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

// Optional animations (ADR-0009): only in response to a gesture, under 250 ms, off by default. A component animates
// only if the caller passes `animated` and the system does not ask for less motion. Motion lives in a separate chunk
// (`motion-impl`), loaded the first time it is needed: with animations off it never even reaches the browser.

/** The Motion chunk's module: what `useMotion` returns when a component animates. */
export type MotionImpl = typeof import('./motion-impl')
type Impl = MotionImpl
let impl: Impl | null = null
let loading: Promise<Impl | null> | null = null

/**
 * Loads the chunk with Motion (only once). It never rejects: if the chunk does not arrive it resolves `null` and
 * forgets the attempt, so the next request tries again; meanwhile the components stay without animations, without
 * remounting anything.
 */
export function loadMotion(): Promise<Impl | null> {
  loading ??= import('./motion-impl').then(
    (m) => (impl = m),
    () => {
      loading = null
      return null
    },
  )
  return loading
}

/**
 * For the client: call it when the user turns animations on (or at startup, with the setting already on), so the
 * chunk is already here at the first action and the first render does not remount anything. Resolves `true` when
 * Motion is ready, `false` if the chunk did not arrive (it is retried on the next request). It never rejects.
 */
export async function preloadMotion(): Promise<boolean> {
  return (await loadMotion()) !== null
}

const REDUCE = '(prefers-reduced-motion: reduce)'

// A single `MediaQueryList` and a single listener for all the components that animate (a list of hundreds of rows does
// not create hundreds). The `MediaQueryList` stays in memory as long as `matchMedia` is the same function; the listener
// lives only while someone is listening.
let shared: { query: MediaQueryList; from: typeof matchMedia } | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function reduceQuery(): MediaQueryList | null {
  if (typeof matchMedia !== 'function') return null
  if (shared === null || (listeners.size === 0 && shared.from !== matchMedia)) shared = { query: matchMedia(REDUCE), from: matchMedia }
  return shared.query
}

function subscribe(onChange: () => void): () => void {
  if (listeners.size === 0) reduceQuery()?.addEventListener?.('change', notify)
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
    if (listeners.size === 0) shared?.query.removeEventListener?.('change', notify)
  }
}

/** True if the system asks for less motion, or if it cannot be known: when in doubt, still. */
function prefersReduced(): boolean {
  const query = reduceQuery()
  return query === null || query.matches === true
}

// Without `animated` nothing is read or listened to: off = zero cost, even with a Checkbox on every row.
const never = () => () => {}
const reduced = () => true

/**
 * The chunk with Motion if this component must animate (`animated` true and `prefers-reduced-motion` not active),
 * otherwise `null`: with `null` the component renders exactly the usual DOM.
 */
export function useMotion(animated: boolean | undefined): Impl | null {
  const on = animated === true
  const noMotion = useSyncExternalStore(on ? subscribe : never, on ? prefersReduced : reduced, reduced)
  const want = on && !noMotion
  const [, setReady] = useState(impl !== null)
  useEffect(() => {
    if (!want || impl !== null) return
    let live = true
    void loadMotion().then((m) => {
      if (live && m) setReady(true)
    })
    return () => {
      live = false
    }
  }, [want])
  return want ? impl : null
}

/**
 * The `ref` of a surface that enters when it opens (a menu, a popover, a hint): `enter` is called once per element,
 * when it mounts, which is the user's gesture. The reference is stable and remembers the element it has seen: a later
 * render, a caller's `ref` that changes, or Motion arriving (or the system no longer asking for less motion) with the
 * surface already open do not play the entrance again.
 */
export function useEntrance<T extends Element>(animated: boolean | undefined, enter: (motion: Impl, el: T) => void): (el: T | null) => void {
  const motion = useMotion(animated)
  const latest = useRef({ motion, enter })
  latest.current = { motion, enter }
  const seen = useRef<T | null>(null)
  return useCallback((el: T | null) => {
    if (!el || el === seen.current) return
    seen.current = el
    const { motion, enter } = latest.current
    if (motion) enter(motion, el)
  }, [])
}
