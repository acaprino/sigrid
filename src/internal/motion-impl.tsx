// The chunk with Motion, loaded only with animations on (see `motion.ts`). The toolkit's own motion: short tweens that
// decelerate (`EASE_OUT`), every one under 250 ms, only in answer to a gesture or to a change the user made; no springs,
// nothing that starts by itself or repeats. The Checkbox mark and the entrance of a sheet and of a menu card follow
// SmoothUI (https://smoothui.dev, MIT, Eduardo Calvo), with fixed durations.
// `layout` is on (the items of a list slide into place): it needs `domMax` instead of `domAnimation`: with the gesture
// helpers the chunk goes from 94 to 157 kB minified (esbuild), and it only reaches the browser with animations on.
import { useEffect, useState, type ReactNode, type Ref } from 'react'
import { animate, hover, press } from 'motion'
import { AnimatePresence, LazyMotion, MotionConfig, domMax, m, useIsPresent, type HTMLMotionProps } from 'motion/react'

export { m }

/**
 * Durations in milliseconds: all under 250 ms (test/animated.test.tsx). `toast` is how long a notice that leaves the
 * column stays in the DOM (Ark's `removeDelay`): by then the list transition (200 ms) has taken it out of sight.
 */
export const DURATION_MS = { toast: 240, mark: 160, sheet: 200, row: 220, popup: 200 } as const

/** Fast start, soft landing: what moves arrives where the eye already is. */
export const EASE_OUT = [0.2, 0, 0, 1] as const

const s = (ms: number) => ms / 1000

/** Durations in milliseconds of the gestures below; with `DURATION_MS`, all under 250 ms (test/animated.test.tsx). */
export const GESTURE_MS = { list: 200, slide: 180, follow: 140, turn: 160, press: 100, tooltip: 120 } as const

/** The transitions of the toolkit's motion, one per kind of movement. */
export const MOTION = {
  /** An item entering or leaving a list, and the others closing up. */
  list: { duration: s(GESTURE_MS.list), ease: EASE_OUT },
  /** The pill that slides under the chosen item of a group. */
  slide: { duration: s(GESTURE_MS.slide), ease: EASE_OUT },
  /** The background that follows the pointer from row to row. */
  follow: { duration: s(GESTURE_MS.follow), ease: EASE_OUT },
  /** The arrow of a group turning. */
  turn: { duration: s(GESTURE_MS.turn), ease: EASE_OUT },
  /** A button going down under the pointer and back. */
  press: { duration: s(GESTURE_MS.press), ease: EASE_OUT },
} as const

/**
 * The column of notices (`Toasts`): where a notice starts when it arrives and where it goes when it leaves. Everything
 * moves with the list transition (`MOTION.list`): entering, moving up one place, closing the gap a notice left.
 * - `enter`: it rises from just below the column, a little smaller, fading in;
 * - `close`: closed by the user or by its time, it sinks a little from where it stands and fades (`y` is added);
 * - `pushed`: pushed out from the top by a fourth notice, it goes up one more place and a little further, fading (`y`
 *   is added to that place).
 */
export const NOTICES = {
  enter: { opacity: 0, y: 26, scale: 0.96 },
  close: { opacity: 0, y: 14, scale: 0.94 },
  pushed: { opacity: 0, y: -10, scale: 0.94 },
  transition: MOTION.list,
} as const

/** Why a notice is leaving the column: closed (by the user, the caller or its time) or pushed out by newer ones. */
export type NoticeLeaving = false | 'closed' | 'pushed'

/**
 * A notice of the column: the same `<div>` as without animations, moved by Motion to its place (`y`). `enter` false
 * for a notice that was already there at mount: it does not come in animated (INV-002). `beyond` is the place above the
 * last one, where a pushed-out notice goes.
 */
export function NoticeCard({ y, enter, leaving, beyond, ...props }: Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit' | 'transition'> & { y: number; enter: boolean; leaving: NoticeLeaving; beyond: number }) {
  const to =
    leaving === 'closed'
      ? { opacity: 0, y: y + NOTICES.close.y, scale: NOTICES.close.scale }
      : leaving === 'pushed'
        ? { opacity: 0, y: beyond + NOTICES.pushed.y, scale: NOTICES.pushed.scale }
        : { opacity: 1, y, scale: 1 }
  return <m.div {...props} initial={enter ? NOTICES.enter : false} animate={to} transition={NOTICES.transition} />
}

/** Motion's features for `NoticeCard`: the column is rendered by Ark's `Toaster`, so the provider goes around it. */
export function Notices({ children }: { children: ReactNode }) {
  return <Motion>{children}</Motion>
}

/**
 * An item of an animated list (an app's list of entries, the new one on top): it comes down a few pixels into its place
 * and fades in; leaving, it fades and gives a little; the others close up (`layout`, in `ListItem` below).
 */
export const LIST_ITEM = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { ...MOTION.list, layout: MOTION.list },
} as const

/**
 * The elements with an exit animation. `initial={false}`: what is already there at mount does not move (no animation
 * on load, ADR-0009 INV-002). `reducedMotion="user"`: a second defense besides `useMotion`.
 */
export function Presence({ children, pop = false }: { children: ReactNode; /** The leaving element steps out of the flow at once and the others slide (`popLayout`). */ pop?: boolean }) {
  return (
    <Motion>
      <AnimatePresence initial={false} mode={pop ? 'popLayout' : 'sync'}>
        {children}
      </AnimatePresence>
    </Motion>
  )
}

/** Motion's features for the `m` elements below it. `reducedMotion="user"`: a second defense besides `useMotion`. */
function Motion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

/**
 * An item of an animated list, direct child of `Presence pop` (it passes the `ref` on: `popLayout` measures it). `enter`
 * false for what was already there or arrived with the first load: it does not come in animated (INV-002). While it
 * leaves it is `inert` and `children` is told so.
 */
export function ListItem({ ref, enter, className, children }: { ref?: Ref<HTMLLIElement>; enter: boolean; className?: string; children: (leaving: boolean) => ReactNode }) {
  const leaving = !useIsPresent()
  return (
    <m.li ref={ref} layout {...LIST_ITEM} initial={enter ? LIST_ITEM.initial : false} inert={leaving} className={className}>
      {children(leaving)}
    </m.li>
  )
}

/**
 * Tells whether the child of `Presence` it sits in is leaving. A removed notice or item stays in the DOM for the
 * duration of the exit (160-180 ms) with the handlers of the last render: whoever uses it must make the element inert
 * (`inert`) and not let clicks through, otherwise a double click on «Cancel» or «Sort» would act twice.
 */
export function Leaving({ children }: { children: (leaving: boolean) => ReactNode }) {
  return <>{children(!useIsPresent())}</>
}

/** Imperative animation on the existing element (Web Animations): no extra node, no style left behind. */
function play(el: Element, keyframes: Keyframe[], ms: number): void {
  if (typeof el.animate !== 'function') return
  el.animate(keyframes, { duration: ms, easing: 'ease-out' })
}

/** The mark of a Checkbox just checked: it appears growing, like the SmoothUI Checkbox but without a spring. */
export function popCheck(el: Element): void {
  play(el, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1)' }], DURATION_MS.mark)
}

/** A side sheet opening: it enters a little from the right. */
export function enterSheet(el: Element): void {
  play(el, [{ opacity: 0.6, transform: 'translateX(24px)' }, { opacity: 1, transform: 'translateX(0)' }], DURATION_MS.sheet)
}

// Added by menu-popover (dropdown-menu, popover): it changes nothing of what is above.
/** Duration of the entrance of the card of a menu or popover, in milliseconds (under 250). */
export const CARD_DURATION_MS = 140

/** The card of a menu or popover opening: it appears with a hint of scale from the side of the button. */
export function enterPopup(el: Element): void {
  play(el, [{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'scale(1)' }], CARD_DURATION_MS)
}

// Added for the row that closes up and the card that lands (from an app's approved sketch of a list): it changes
// nothing of what is above.
/**
 * A row (or a card) leaving the list, usually because it was completed: the row may have already dimmed on click (the
 * app's row decides), here it fades and closes up in height, so the rows below rise without a jolt. No entrance: a new
 * row appears still. The height is animated without `layout` (see above).
 */
export const ROW_EXIT = {
  initial: false,
  exit: { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0 },
  transition: { duration: s(DURATION_MS.row), ease: 'easeOut' },
} as const

/** The card just placed in a column of the board: it drops a little into its place, only once. */
export function landCard(el: Element): void {
  play(el, [{ opacity: 0, transform: 'translateY(-8px) scale(0.985)' }, { opacity: 1, transform: 'none' }], DURATION_MS.popup)
}

// --- Gestures on an element that already exists (no remount when the chunk arrives). ---

/**
 * A button goes down a little while pressed and comes back; under the pointer it stays still by default (1), as desktop
 * buttons do, in rows where many sit side by side. An app may ask for a hover scale.
 */
export const PRESS_SCALE = { hover: 1, tap: 0.97 } as const

/**
 * Press feedback on the existing `<button>`: the scale of `hoverScale` under the pointer, of `tapScale` while pressed,
 * with `MOTION.press`. Returns the cleanup. A disabled button does not move.
 */
export function pressable(el: HTMLElement, { hoverScale = PRESS_SCALE.hover, tapScale = PRESS_SCALE.tap }: { hoverScale?: number; tapScale?: number } = {}): () => void {
  const idle = (target: Element) => target.matches(':disabled, [aria-disabled="true"]')
  const to = (scale: number) => void animate(el, { scale }, MOTION.press)
  let over = false
  const stopHover = hover(el, (target) => {
    if (idle(target)) return
    over = true
    to(hoverScale)
    return () => {
      over = false
      to(1)
    }
  })
  const stopPress = press(el, (target) => {
    if (idle(target)) return
    to(tapScale)
    return () => to(over ? hoverScale : 1)
  })
  return () => {
    stopHover()
    stopPress()
    el.style.removeProperty('scale')
    el.style.removeProperty('transform')
  }
}

/** A hint appearing: it fades in from just smaller than its size, quickly, so it never trails the pointer. */
export function enterTooltip(el: Element): void {
  play(el, [{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], GESTURE_MS.tooltip)
}

/**
 * The pill under the chosen item of a group. Rendered inside the chosen item only; when the choice changes Motion
 * carries it from the old item to the new one (`layoutId`). On mount it is simply there.
 */
export function Highlight({ id, className }: { id: string; className?: string }) {
  return (
    <Motion>
      <m.span aria-hidden="true" data-slot="highlight" layoutId={id} transition={MOTION.slide} className={className} />
    </Motion>
  )
}

/** One arrow that turns a quarter when its group opens. */
export function Turn({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <Motion>
      <m.span aria-hidden="true" initial={false} animate={{ rotate: open ? 90 : 0 }} transition={MOTION.turn} className="inline-flex">
        {children}
      </m.span>
    </Motion>
  )
}

type Box = { top: number; left: number; width: number; height: number }

/**
 * One hover background for the whole container: it moves with the mouse from row to row (`MOTION.follow`) and fades when
 * the pointer leaves. The rows are found by `selector` (delegation: no handler per
 * row); `container` must be positioned. Mouse only: a finger has no hover.
 */
export function HoverHighlight({ container, selector, className }: { container: HTMLElement | null; selector: string; className?: string }) {
  const [box, setBox] = useState<Box | null>(null)
  useEffect(() => {
    if (!container) return
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const row = e.target instanceof Element ? e.target.closest(selector) : null
      if (!row || !container.contains(row)) return setBox(null)
      const r = row.getBoundingClientRect()
      const c = container.getBoundingClientRect()
      setBox({ top: r.top - c.top + container.scrollTop, left: r.left - c.left + container.scrollLeft, width: r.width, height: r.height })
    }
    const leave = () => setBox(null)
    container.addEventListener('pointerover', over)
    container.addEventListener('pointerleave', leave)
    // A list scrolling under a still pointer: the row is no longer where the background sits.
    container.addEventListener('scroll', leave, true)
    return () => {
      container.removeEventListener('pointerover', over)
      container.removeEventListener('pointerleave', leave)
      container.removeEventListener('scroll', leave, true)
    }
  }, [container, selector])
  return (
    <Motion>
      <AnimatePresence>
        {box ? <m.div key="hover" aria-hidden="true" data-slot="hover-highlight" initial={false} animate={{ ...box, opacity: 1 }} exit={{ opacity: 0 }} transition={MOTION.follow} className={className} /> : null}
      </AnimatePresence>
    </Motion>
  )
}
