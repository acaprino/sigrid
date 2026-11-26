import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'

// Optional animations: only in response to a gesture, under 250 ms, off by default. A component animates
// when MotionProvider or the control enables it and the system allows motion. Motion lives in a separate chunk
// (`motion-impl`), loaded the first time it is needed: with animations off it never even reaches the browser.

/** The Motion chunk's module: what `useMotion` returns when a component animates. */
export type MotionImpl = typeof import('./motion-impl')
const MotionPreference = createContext(false)

/** The mark `MotionProvider` leaves on the document root while motion is on: theme.css eases the state changes of the controls under it. */
export const MOTION_ATTR = 'data-motion'
let marking = 0

/**
 * Enable motion for a subtree, including its portals. Individual controls can override the preference. While at least
 * one provider has motion on, the document root carries `data-motion`: with it (and only where the system allows
 * motion) a control's fill, border and text ease to the state under the pointer instead of snapping (theme.css).
 */
export function MotionProvider({ animated, ease, pace, children }: { animated: boolean; /** The curve of every movement. Absent: the one in use (Fluent's curves at first). */ ease?: MotionEase | undefined; /** How long movements take, as a multiple of the toolkit's times. Absent: the one in use (1 at first). */ pace?: number | undefined; children: ReactNode }) {
  useEffect(() => {
    if (!animated || typeof document === 'undefined') return
    const root = document.documentElement
    marking += 1
    root.setAttribute(MOTION_ATTR, '')
    return () => {
      marking -= 1
      if (marking === 0) root.removeAttribute(MOTION_ATTR)
    }
  }, [animated])
  useEffect(() => {
    if (ease === undefined && pace === undefined) return
    applyMotionFeel({ ...(ease === undefined ? {} : { ease }), ...(pace === undefined ? {} : { pace }) })
  }, [ease, pace])
  return createElement(MotionPreference.Provider, { value: animated }, children)
}

// --- The feel of the motion: its curve and its pace, the app's to choose. ---

/**
 * The curve of a movement: one of the four of CSS, the same for every movement, or `fluent`, where each kind of
 * movement has its own of Fluent's (what enters decelerates, what leaves accelerates, what moves in place eases).
 */
export type MotionEase = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'fluent'

/** The four curves of CSS as the control points of a cubic Bézier (CSS Easing Functions Level 1). */
export const MOTION_EASES = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
} as const

/** The curves a feel may name, in the order they are offered. */
export const MOTION_EASE_NAMES: readonly MotionEase[] = ['fluent', 'ease-in-out', 'ease', 'ease-out', 'ease-in']

/** True for a value that names a curve (one kept by the app between visits). */
export function isMotionEase(value: unknown): value is MotionEase {
  return typeof value === 'string' && (MOTION_EASE_NAMES as readonly string[]).includes(value)
}

/** Fluent 2's curves for the three kinds of movement (`@fluentui/tokens`), for the `fluent` feel and for CSS. */
const FLUENT_BY_KIND = { enter: [0, 0, 0, 1], leave: [0.8, 0, 0.78, 1], move: [0.33, 0, 0.67, 1] } as const

/** The kind of a movement: what arrives, what goes, what changes place or size while staying. */
export type MotionKind = keyof typeof FLUENT_BY_KIND

/** The limits of the pace: half the toolkit's times to twice them. */
export const MOTION_PACE = { min: 0.5, max: 2 } as const

/** How the toolkit moves: the curve, and the pace (1: the toolkit's own times; 1.5: half as long again). */
export type MotionFeel = { ease: MotionEase; pace: number }

/**
 * Each kind of movement on its own curve of Fluent's, at the toolkit's own times: what enters starts fast and settles,
 * so it never reads as lag (the review of 2026-11-26; one curve for all three, ease-in-out, was the default before).
 */
export const DEFAULT_MOTION_FEEL: MotionFeel = { ease: 'fluent', pace: 1 }

let feel: MotionFeel = DEFAULT_MOTION_FEEL

/** The feel in use. */
export function motionFeel(): MotionFeel {
  return feel
}

/** The curve of a kind of movement under the feel in use, as the control points of a cubic Bézier. */
export function motionCurve(kind: MotionKind): readonly [number, number, number, number] {
  return feel.ease === 'fluent' ? FLUENT_BY_KIND[kind] : MOTION_EASES[feel.ease]
}

/** A duration of the toolkit, in milliseconds, at the pace in use. */
export function motionMs(ms: number): number {
  return Math.round(ms * feel.pace)
}

/** The CSS variables the stylesheet's own movements read (theme.css), for a feel. */
export function motionVariables(of: MotionFeel): Record<string, string> {
  const curve = (kind: MotionKind) => `cubic-bezier(${(of.ease === 'fluent' ? FLUENT_BY_KIND[kind] : MOTION_EASES[of.ease]).join(', ')})`
  const ms = (value: number) => `${Math.round(value * of.pace)}ms`
  return {
    '--motion-faster': ms(100),
    '--motion-fast': ms(150),
    '--motion-normal': ms(200),
    '--motion-ease-enter': curve('enter'),
    '--motion-ease-leave': curve('leave'),
    '--motion-ease-move': curve('move'),
  }
}

/**
 * Chooses how the toolkit moves, for the whole page: the curve, the pace, or both (what is not given stays as it is).
 * What moves by script reads it at each movement, and what moves by the stylesheet reads the variables written on the
 * document root. It turns nothing on: `MotionProvider animated` (or a part's `animated`) does. An app calls it in
 * its entry file with what the user chose, as it does `applyTheme`; `MotionProvider` calls it for its `ease` and `pace`.
 */
export function applyMotionFeel(next: Partial<MotionFeel>, root: HTMLElement | null = typeof document === 'undefined' ? null : document.documentElement): MotionFeel {
  const ease = next.ease !== undefined && isMotionEase(next.ease) ? next.ease : feel.ease
  const pace = typeof next.pace === 'number' && Number.isFinite(next.pace) ? Math.min(MOTION_PACE.max, Math.max(MOTION_PACE.min, next.pace)) : feel.pace
  feel = { ease, pace }
  if (root) for (const [name, value] of Object.entries(motionVariables(feel))) root.style.setProperty(name, value)
  return feel
}

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
 * The chunk with Motion when the local or inherited preference is enabled and reduced motion is off,
 * otherwise `null`: with `null` the component renders exactly the usual DOM.
 */
export function useMotion(animated?: boolean): Impl | null {
  const preference = useContext(MotionPreference)
  const on = animated ?? preference
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
 * Whether a part may move: the local or inherited preference is on and the system does not ask for less motion. It
 * loads nothing: for a part that moves with CSS alone (the things of a `GraphCanvas` gliding to their new places).
 */
export function useMotionAllowed(animated?: boolean): boolean {
  const preference = useContext(MotionPreference)
  const on = animated ?? preference
  const noMotion = useSyncExternalStore(on ? subscribe : never, on ? prefersReduced : reduced, reduced)
  return on && !noMotion
}

/**
 * The `ref` of a surface that enters when it opens (a menu, a popover, a hint): `enter` is called once per element,
 * when it mounts, which is the user's gesture. The reference is stable and remembers the element it has seen: a later
 * render, a caller's `ref` that changes, or Motion arriving (or the system no longer asking for less motion) with the
 * surface already open do not play the entrance again.
 */
export function useEntrance<T extends Element>(animated: boolean | undefined, enter: (motion: Impl, el: T) => void, open = true): (el: T | null) => void {
  const motion = useMotion(animated)
  const latest = useRef({ motion, enter })
  latest.current = { motion, enter }
  const seen = useRef<T | null>(null)
  return useCallback((el: T | null) => {
    if (!open) {
      seen.current = null
      return
    }
    if (!el || el === seen.current) return
    seen.current = el
    const { motion, enter } = latest.current
    if (motion) enter(motion, el)
  }, [open])
}
