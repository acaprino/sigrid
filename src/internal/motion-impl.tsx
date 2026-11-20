// The chunk with Motion, loaded only with animations on (see `motion.ts`). All of the toolkit's motion is designed here.
//
// What motion is for. It answers a gesture: it shows where a thing came from, where it went, or that a press was
// felt. It never asks for attention by itself, so nothing starts on load, nothing repeats, nothing swings past its end.
//
// The values are Fluent 2's motion tokens (Microsoft, MIT; see THIRD_PARTY.md): its durations (`FLUENT_DURATIONS`) and
// its curves (`FLUENT_CURVES`), so the toolkit moves as the system around it does. Only the token values are taken;
// which token each movement uses is decided here, by the kind of movement, as the names of the curves ask:
//   entering  decelerate (`decelerateMid`): it arrives fast and settles. A hint, a card, a sheet, a notice, a new item,
//             the check mark, and a button going down or coming back under the finger.
//   leaving   accelerate (`accelerateMin`, the softest): it gathers speed and is gone. An item or a notice that leaves, the hover
//             background when the pointer leaves.
//   moving    easy ease (`easyEase`): what stays on the page and changes place starts and ends gently. The pill under
//             a choice, a list closing up, the notices moving up, the hover background, an arrow turning.
// Every duration is under 250 ms, so of Fluent's eight only the first four are used:
//   100  `faster`  small and near: a press, a hint, the check mark, the hover background, whatever leaves
//   150  `fast`    a button coming back, an arrow turning, the pill, a menu or popover card, a card landing
//   200  `normal`  several things moving together (a list, the column of notices), a row closing up, a side sheet;
//                  and how long a leaving notice stays in the DOM, after its exit has ended
//
// In the plane. Things slide and fade; they do not zoom, which would add a depth the flat page does not have. A
// surface that opens comes from the side of what opened it, by a distance that grows with its size (`TRAVEL_PX`).
// That side is read one frame after it mounts, when it has been placed: until then it is held unseen.
// Scale is kept for two things that are themselves pressed: the button under the finger and the stamped check mark.
// Only `transform` and `opacity` move; the one exception is the height of a row that closes up (`ROW_EXIT`).
//
// `layout` is on (the items of a list slide into place): it needs `domMax` instead of `domAnimation`: with the gesture
// helpers the chunk goes from 94 to 157 kB minified (esbuild), and it only reaches the browser with animations on.
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { animate, hover, press } from 'motion'
import { AnimatePresence, LazyMotion, MotionConfig, domMax, m, useIsPresent, type HTMLMotionProps } from 'motion/react'

export { m }

/**
 * Fluent 2's duration tokens, in milliseconds (`@fluentui/tokens`, `durationFaster`, `durationFast`,
 * `durationNormal`): the ones under 250 ms that the toolkit uses. The values are Fluent's, unchanged.
 */
export const FLUENT_DURATIONS = { faster: 100, fast: 150, normal: 200 } as const

/**
 * Fluent 2's curve tokens, as the control points of a cubic Bézier (`@fluentui/tokens`, `curveDecelerateMid`,
 * `curveAccelerateMid`, `curveEasyEase`): the ones the toolkit uses. The values are Fluent's, unchanged. None leaves
 * 0..1: nothing overshoots.
 */
export const FLUENT_CURVES = {
  /** What enters: fast at first, then it settles. */
  decelerateMid: [0, 0, 0, 1],
  /** What leaves: it gathers speed and is gone. */
  accelerateMin: [0.8, 0, 0.78, 1],
  /** What moves from one place to another on the page: a gentle start and a gentle end. */
  easyEase: [0.33, 0, 0.67, 1],
} as const

/** The entering curve for the Web Animations below. */
const CSS_ENTER = `cubic-bezier(${FLUENT_CURVES.decelerateMid.join(', ')})`

/**
 * Durations in milliseconds of what enters or leaves once: all under 250 ms (test/animated.test.tsx). `toast` is how
 * long a notice that leaves the column stays in the DOM (Ark's `removeDelay`): longer than its exit (`GESTURE_MS.leave`).
 */
export const DURATION_MS = { toast: FLUENT_DURATIONS.normal, mark: FLUENT_DURATIONS.faster, sheet: FLUENT_DURATIONS.normal, row: FLUENT_DURATIONS.normal, popup: FLUENT_DURATIONS.fast, land: FLUENT_DURATIONS.fast } as const

const s = (ms: number) => ms / 1000

/** Durations in milliseconds of the gestures below; with `DURATION_MS`, all under 250 ms (test/animated.test.tsx). */
export const GESTURE_MS = {
  press: FLUENT_DURATIONS.faster,
  release: FLUENT_DURATIONS.fast,
  tooltip: FLUENT_DURATIONS.faster,
  follow: FLUENT_DURATIONS.faster,
  leave: FLUENT_DURATIONS.faster,
  turn: FLUENT_DURATIONS.fast,
  slide: FLUENT_DURATIONS.fast,
  enter: FLUENT_DURATIONS.normal,
  list: FLUENT_DURATIONS.normal,
} as const

/**
 * The transitions of the toolkit's motion, one per kind of movement: what enters decelerates, what leaves accelerates,
 * what moves in place eases at both ends.
 */
export const MOTION = {
  /** An item or a notice entering: it arrives and settles. */
  enter: { duration: s(GESTURE_MS.enter), ease: FLUENT_CURVES.decelerateMid },
  /** The others making room or closing up: a list, the column of notices. */
  list: { duration: s(GESTURE_MS.list), ease: FLUENT_CURVES.easyEase },
  /** What leaves (an item of a list, a notice, the hover background): gone before the others arrive over its place. */
  leave: { duration: s(GESTURE_MS.leave), ease: FLUENT_CURVES.accelerateMin },
  /** The pill that slides under the chosen item of a group. */
  slide: { duration: s(GESTURE_MS.slide), ease: FLUENT_CURVES.easyEase },
  /** The background that follows the pointer from row to row. */
  follow: { duration: s(GESTURE_MS.follow), ease: FLUENT_CURVES.easyEase },
  /** The arrow of a group turning. */
  turn: { duration: s(GESTURE_MS.turn), ease: FLUENT_CURVES.easyEase },
  /** A button going down under the pointer: at once. */
  press: { duration: s(GESTURE_MS.press), ease: FLUENT_CURVES.decelerateMid },
  /** The same button coming back: a little slower than it went down, so a quick click is still seen. */
  release: { duration: s(GESTURE_MS.release), ease: FLUENT_CURVES.decelerateMid },
} as const

/**
 * How far a thing travels as it enters, in pixels on the 4px grid: the larger the surface, the longer the way, and
 * always a small part of its own size (it settles into place, it does not cross the screen).
 */
export const TRAVEL_PX = { hint: 4, card: 8, row: 8, notice: 24, sheet: 32 } as const

/**
 * The column of notices (`Toasts`): where a notice starts when it arrives and where it goes when it leaves.
 * - `enter`: it rises from just below the column, fading in (`MOTION.enter`);
 * - `close`: closed by the user or by its time, it sinks a little from where it stands and fades (`y` is added);
 * - `pushed`: pushed out from the top by a newer notice, it goes up one more place and a little further, fading (`y`
 *   is added to that place). Both leave with `MOTION.leave`;
 * - `transition`: the ones that stay move up one place or close the gap a notice left (`MOTION.list`).
 * A notice keeps its size all the way: its text stays sharp and the column keeps its edge.
 */
export const NOTICES = {
  enter: { opacity: 0, y: TRAVEL_PX.notice },
  close: { opacity: 0, y: TRAVEL_PX.row },
  pushed: { opacity: 0, y: -TRAVEL_PX.row },
  entering: MOTION.enter,
  leaving: MOTION.leave,
  transition: MOTION.list,
} as const

/** No movement: the value is simply set. */
const AT_ONCE = { duration: 0 } as const

/** Why a notice is leaving the column: closed (by the user, the caller or its time) or pushed out by newer ones. */
export type NoticeLeaving = false | 'closed' | 'pushed'

/**
 * A notice of the column: the same `<div>` as without animations, moved by Motion to its place (`y`). `enter` false
 * for a notice that was already there at mount: it does not come in animated (INV-002). `still` while such a notice is
 * being put in its place for the first time (its height and the others' are measured after it mounts): it is simply
 * put there, it does not glide. `beyond` is the place above the last one, where a pushed-out notice goes.
 */
export function NoticeCard({ y, enter, still = false, leaving, beyond, ...props }: Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit' | 'transition'> & { y: number; enter: boolean; still?: boolean; leaving: NoticeLeaving; beyond: number }) {
  const to = leaving === 'closed' ? { opacity: 0, y: y + NOTICES.close.y } : leaving === 'pushed' ? { opacity: 0, y: beyond + NOTICES.pushed.y } : { opacity: 1, y }
  // Entering until its entrance has ended; from then on it only moves with the column, or leaves.
  const [arrived, setArrived] = useState(!enter)
  const transition = still ? AT_ONCE : leaving ? NOTICES.leaving : arrived ? NOTICES.transition : NOTICES.entering
  return <m.div {...props} initial={enter ? NOTICES.enter : false} animate={to} transition={transition} onAnimationComplete={() => setArrived(true)} />
}

/** Motion's features for `NoticeCard`: the column is rendered by Ark's `Toaster`, so the provider goes around it. */
export function Notices({ children }: { children: ReactNode }) {
  return <Motion>{children}</Motion>
}

/**
 * An item of an animated list (an app's list of entries, the new one on top): it comes down a few pixels into its place
 * and fades in (`MOTION.enter`), while the others make room (`layout`, with `MOTION.list`). Leaving, it only fades, in
 * the short time (`MOTION.leave`): it stands still and is gone before the others have closed up over its place.
 */
export const LIST_ITEM = {
  initial: { opacity: 0, y: -TRAVEL_PX.row },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, transition: MOTION.leave },
  transition: { ...MOTION.enter, layout: MOTION.list },
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
 * duration of the exit (100-200 ms) with the handlers of the last render: whoever uses it must make the element inert
 * (`inert`) and not let clicks through, otherwise a double click on «Cancel» or «Sort» would act twice.
 */
export function Leaving({ children }: { children: (leaving: boolean) => ReactNode }) {
  return <>{children(!useIsPresent())}</>
}

/**
 * One entrance on the existing element (Web Animations): from `from` to whatever the element's own style is, on the
 * entering curve. Only the start is given: the end is the computed style, so a style that changes meanwhile (a sheet
 * being dragged) is followed, not overridden. No extra node, no style left behind.
 */
function play(el: Element, from: Keyframe, ms: number): void {
  if (typeof el.animate !== 'function') return
  el.animate([{ ...from, offset: 0 }], { duration: ms, easing: CSS_ENTER })
}

/**
 * The entrance of a floating surface: it fades in coming `px` from the side of what opened it. That side is known only
 * once the positioning library has placed the surface (it may have flipped it for lack of room), which happens after
 * it mounts: so it is held unseen for one frame, then the side is found and the entrance played. If no frame comes (a
 * hidden page) the hold ends by itself and the surface is simply there.
 */
function playFromAnchor(el: Element, anchor: Element | null | undefined, px: number, ms: number): void {
  if (typeof el.animate !== 'function') return
  const hold = el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: ms })
  const frame = el.ownerDocument.defaultView?.requestAnimationFrame ?? requestAnimationFrame
  frame(() => {
    hold.cancel?.()
    if (el.isConnected) play(el, { opacity: 0, transform: fromSide(sideOf(el, anchor), px) }, ms)
  })
}

/**
 * The side of its anchor a placed surface is on. With the `anchor` it is measured: where the surface really is, whatever
 * the library's attribute says (one of them writes its attribute a few frames after it has placed the surface, and
 * keeps the one of the last opening until then). Without it, the attribute is read, on the element or on its
 * positioner; a logical side follows the direction of the text. Empty when it cannot be known.
 */
function sideOf(el: Element, anchor: Element | null | undefined): string {
  const a = anchor?.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  if (a && (a.width > 0 || a.height > 0) && (r.width > 0 || r.height > 0)) {
    if (r.top >= a.bottom) return 'bottom'
    if (r.bottom <= a.top) return 'top'
    if (r.left >= a.right) return 'right'
    if (r.right <= a.left) return 'left'
  }
  const at = [el, el.parentElement].map((n) => n?.getAttribute('data-side') ?? n?.getAttribute('data-placement')).find(Boolean) ?? ''
  if (!at.startsWith('inline-')) return at.split('-')[0] ?? ''
  const rtl = getComputedStyle(el).direction === 'rtl'
  return (at === 'inline-start') !== rtl ? 'left' : 'right'
}

/** Where a surface on that side starts: `px` nearer to its anchor. With no side known it starts in place and only fades. */
function fromSide(side: string, px: number): string {
  if (side === 'bottom') return `translateY(${-px}px)`
  if (side === 'top') return `translateY(${px}px)`
  if (side === 'right') return `translateX(${-px}px)`
  if (side === 'left') return `translateX(${px}px)`
  return 'none'
}

/** The mark of a Checkbox just checked: stamped once, growing from half its size as it fades in. */
export function popCheck(el: Element): void {
  play(el, { opacity: 0, transform: 'scale(0.5)' }, DURATION_MS.mark)
}

/** A side sheet opening: it slides in the last stretch from the right edge, fading in. */
export function enterSheet(el: Element): void {
  play(el, { opacity: 0, transform: `translateX(${TRAVEL_PX.sheet}px)` }, DURATION_MS.sheet)
}

/** Duration of the entrance of the card of a menu or popover, in milliseconds (under 250). */
export const CARD_DURATION_MS = DURATION_MS.popup

/**
 * The card of a menu or popover opening: it fades in, coming a few pixels from the side of its button. `anchor` is that
 * button, for a caller whose positioning library does not tell the side in time: the side is then measured.
 */
export function enterPopup(el: Element, anchor?: Element | null): void {
  playFromAnchor(el, anchor, TRAVEL_PX.card, CARD_DURATION_MS)
}

/**
 * A row (or a card) leaving the list, usually because it was completed: the row may have already dimmed on click (the
 * app's row decides), here it fades and closes up in height, so the rows below rise without a jolt. No entrance: a new
 * row appears still. The height is animated without `layout` (see above): the one motion outside transform and opacity.
 * The row itself leaves (it fades accelerating, in the short time); the room it took closes up as a movement in place.
 */
export const ROW_EXIT = {
  initial: false,
  exit: { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0 },
  transition: { duration: s(DURATION_MS.row), ease: FLUENT_CURVES.easyEase, opacity: MOTION.leave },
} as const

/** The card just placed in a column of the board: it comes down a little into its place, only once. */
export function landCard(el: Element): void {
  play(el, { opacity: 0, transform: `translateY(${-TRAVEL_PX.card}px)` }, DURATION_MS.land)
}

// --- Gestures on an element that already exists (no remount when the chunk arrives). ---

/**
 * A button goes down a little while pressed and comes back: 0.96 is about a pixel on each side of a 40px control,
 * enough to be seen and too little to look like a bounce. Under the pointer it stays still by default (1), as desktop
 * buttons do, in rows where many sit side by side. An app may ask for a hover scale.
 */
export const PRESS_SCALE = { hover: 1, tap: 0.96 } as const

/**
 * Press feedback on the existing `<button>`: the scale of `tapScale` while pressed (`MOTION.press`), back when released
 * (`MOTION.release`); the scale of `hoverScale` under the pointer, when an app asks for one. With the default hover
 * nothing listens to the pointer and nothing is written on the element until it is pressed. Returns the cleanup, which
 * also stops a movement still running. A disabled button does not move.
 */
export function pressable(el: HTMLElement, { hoverScale = PRESS_SCALE.hover, tapScale = PRESS_SCALE.tap }: { hoverScale?: number; tapScale?: number } = {}): () => void {
  const idle = (target: Element) => target.matches(':disabled, [aria-disabled="true"]')
  let running: { stop: () => void } | null = null
  const to = (scale: number, transition: (typeof MOTION)['press' | 'release']) => void (running = animate(el, { scale }, transition))
  let over = false
  const stopHover =
    hoverScale === 1
      ? () => {}
      : hover(el, (target) => {
          if (idle(target)) return
          over = true
          to(hoverScale, MOTION.release)
          return () => {
            over = false
            to(1, MOTION.release)
          }
        })
  const stopPress = press(el, (target) => {
    if (idle(target)) return
    to(tapScale, MOTION.press)
    return () => to(over ? hoverScale : 1, MOTION.release)
  })
  return () => {
    stopHover()
    stopPress()
    running?.stop()
    el.style.removeProperty('scale')
    el.style.removeProperty('transform')
  }
}

/** A hint appearing: it fades in a few pixels from its button, quickly, so it never trails the pointer. */
export function enterTooltip(el: Element, anchor?: Element | null): void {
  playFromAnchor(el, anchor, TRAVEL_PX.hint, GESTURE_MS.tooltip)
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

type Box = { top: number; left: number; width: number; height: number; fromX: number; fromY: number }

/** A size ratio to start from, or 1 when there is nothing to start from or the difference is not worth a movement. */
const ratio = (from: number | undefined, to: number) => (from && to && Math.abs(from / to - 1) > 0.001 ? from / to : 1)

/**
 * One hover background for the whole container: it appears at once on the first row, glides with the mouse from row to
 * row (`MOTION.follow`) and fades when the pointer leaves. Only its transform moves: it takes the place and the size of
 * the new row at once, and is carried there from where and how large it was seen (a translation from the container's
 * corner, a scale from its own). So it also glides between rows of different heights, without animating a size. The
 * rows are found by `selector` (delegation: no handler per row); `container` must be positioned. Mouse only: a finger
 * has no hover. It never takes the pointer from the rows under it.
 */
export function HoverHighlight({ container, selector, className }: { container: HTMLElement | null; selector: string; className?: string }) {
  const [box, setBox] = useState<Box | null>(null)
  const mark = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!container) return
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const row = e.target instanceof Element ? e.target.closest(selector) : null
      if (!row || !container.contains(row)) return setBox(null)
      const r = row.getBoundingClientRect()
      const c = container.getBoundingClientRect()
      // How large it is seen right now (mid-glide too): the scale starts from there.
      const seen = mark.current?.getBoundingClientRect()
      setBox({ top: r.top - c.top + container.scrollTop, left: r.left - c.left + container.scrollLeft, width: r.width, height: r.height, fromX: ratio(seen?.width, r.width), fromY: ratio(seen?.height, r.height) })
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
        {box ? (
          <m.div
            key="hover"
            ref={mark}
            aria-hidden="true"
            data-slot="hover-highlight"
            initial={false}
            animate={{ x: box.left, y: box.top, scaleX: box.fromX === 1 ? 1 : [box.fromX, 1], scaleY: box.fromY === 1 ? 1 : [box.fromY, 1], opacity: 1 }}
            exit={{ opacity: 0, transition: MOTION.leave }}
            transition={MOTION.follow}
            style={{ top: 0, left: 0, width: box.width, height: box.height, originX: 0, originY: 0, pointerEvents: 'none' }}
            className={className}
          />
        ) : null}
      </AnimatePresence>
    </Motion>
  )
}
