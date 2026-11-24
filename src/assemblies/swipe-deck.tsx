// A deck of cards decided one at a time, each to one of two sides: keep or skip, approve or refuse, now or later.
// One card, one decision: nothing else on the screen asks for attention while a pile is sorted.
// Three ways to decide, all the same decision: drag the card past a third of the way (or flick it) and let go; press
// the left or right arrow with the card in focus; or press one of the two buttons under the deck, which are always
// there and never move (R14), so nothing depends on a gesture. While the card is dragged far enough, the word of the
// side it would go to shows on it: what letting go will do is said before it is done.
// The deck keeps nothing: the app holds the cards (`items`, the first is on top) and takes the decided one out when
// `onSwipe` tells it; to take a decision back it puts the card first again (an `Undo` in a notice, `Toasts`). A card
// the app leaves in comes back to its place.
// The app takes the card out as `onSwipe` runs, and puts it back if saving the decision fails: a card taken out
// later is seen once more at rest before it goes.
// The card follows the finger at once (that is the gesture, not an animation); thrown, it leaves with a movement, and
// let go before the mark it comes back with one, only when motion is on (`animated`, or `MotionProvider`). The next
// card lies under the top one, still: the flat page has no stack that zooms.
import * as React from "react"
import { cn, isEmptyNode } from "../lib/utils"
import { FOCUS_RING } from "../lib/focus"
import { Icon, type IconName } from "../icons"
import { useWords } from "../words"
import { useMotion } from "../internal/motion"
import { Button } from "../primitives/button"

/** The side a card was decided to. */
export type SwipeDirection = "left" | "right"

/** How far, in px, a card is dragged before letting go decides it. */
export const SWIPE_DISTANCE_PX = 96
/**
 * A quicker throw decides from nearer: at least this far, in px, and this fast, in px per millisecond, when the finger
 * left the card no later than `within` milliseconds after its last move (a card held still is not thrown).
 */
export const SWIPE_FLICK = { distance: 24, speed: 0.5, within: 100 } as const

export type SwipeDeckProps<T> = {
  /** The cards still to decide; the first is on top. The app takes a card out when it is decided. */
  items: readonly T[]
  /** What tells a card from the others. */
  getKey: (item: T) => string
  /** The card's name for screen readers (its title). */
  getLabel: (item: T) => string
  /** What a card shows: laid out with the toolkit's parts (`Heading`, `Text`, `DescriptionList`). */
  children: (item: T) => React.ReactNode
  /** A card was decided: the app takes it out of `items` as this runs (and offers Undo in a notice), and puts it back if the decision could not be saved. */
  onSwipe: (item: T, direction: SwipeDirection) => void
  /** The name of the deck for screen readers («Requests to review»). */
  label: string
  /** What each side means, in a word or two («Skip», «Keep»): the buttons under the deck, and the word on a dragged card. */
  leftLabel: string
  rightLabel: string
  /** The icons of the two buttons. Default the two arrows. */
  leftIcon?: IconName | undefined
  rightIcon?: IconName | undefined
  /** What takes the deck's place when no card is left (an `Empty`). Absent: the toolkit's words. */
  empty?: React.ReactNode
  /** No card can be decided (while a decision is being saved). */
  disabled?: boolean | undefined
  /** The thrown card leaves with a movement, and a card let go early comes back with one. Absent: as `MotionProvider` says. */
  animated?: boolean | undefined
  className?: string | undefined
}

// The surface of a `Card`: raised, the smallest shadow, no border (R4).
const CARD = "col-start-1 row-start-1 flex min-w-0 flex-col gap-3 rounded-lg bg-raised p-4 text-sm text-ink shadow-xs"
// The inverted tag of a hint (`Tooltip`).
const SIDE_WORD = "absolute top-3 rounded-md bg-ink px-2 py-1.5 text-2xs font-semibold text-paper"
const INTERACTIVE = "button, a, input, textarea, select, summary, [role='button'], [contenteditable='true']"

type Drag = { id: number; x0: number; y0: number; t: number; x: number; speed: number }

/** A deck of cards decided one at a time, to the left or to the right. */
function SwipeDeck<T>({ items, getKey, getLabel, children, onSwipe, label, leftLabel, rightLabel, leftIcon = "moveLeft", rightIcon = "moveRight", empty, disabled = false, animated, className }: SwipeDeckProps<T>) {
  const words = useWords().deck
  const motion = useMotion(animated)
  const top = items[0]
  const next = items[1]
  const topKey = top === undefined ? null : getKey(top)
  const card = React.useRef<HTMLDivElement>(null)
  const emptied = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<Drag | null>(null)
  const [offset, setOffset] = React.useState<{ x: number; y: number } | null>(null)
  // Nothing is announced before the first decision.
  const [decided, setDecided] = React.useState(false)
  const [, redraw] = React.useState(0)
  const busy = React.useRef(false)
  const release = React.useRef<(() => void) | null>(null)
  const hadFocus = React.useRef(false)
  const live = React.useRef(true)
  React.useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])
  // The card on top as it is now, for a decision that ends after a movement.
  const now = React.useRef({ topKey, onSwipe })
  now.current = { topKey, onSwipe }

  // Once the deck is drawn again after a decision, the thrown card (gone, or left in by the app) is let go of.
  React.useLayoutEffect(() => {
    release.current?.()
    release.current = null
  })
  // Another card on top (decided, or put there by the app while one was held): a drag in hand was of the card
  // before, and ends here. The new card takes the focus the decided one had; with none left, the place where the
  // cards were takes it, so the keyboard is not left nowhere. A card the app left in keeps what it had.
  const shown = React.useRef(topKey)
  React.useLayoutEffect(() => {
    if (shown.current === topKey) {
      // Not while the card is still leaving: its focus is for the one that comes after it.
      if (!busy.current) hadFocus.current = false
      return
    }
    shown.current = topKey
    drag.current = null
    setOffset(null)
    if (!hadFocus.current) return
    hadFocus.current = false
    ;(card.current ?? emptied.current)?.focus()
  })

  const rest = (el: HTMLElement | null) => {
    // Back to its place: with motion on, from where the finger left it.
    if (motion && el && el.style.translate) motion.settleCard(el, { translate: el.style.translate, rotate: el.style.rotate || "0deg" })
    setOffset(null)
  }

  /** Decides the card on top; false when nothing was decided (no card, off, one already leaving). */
  const decide = (direction: SwipeDirection): boolean => {
    if (top === undefined || topKey === null || disabled || busy.current) return false
    const el = card.current
    hadFocus.current = el !== null && el.ownerDocument.activeElement === el
    const finish = () => {
      busy.current = false
      // The deck went, or the app changed the card on top while this one was leaving: there is nothing to decide.
      if (!live.current || now.current.topKey !== topKey) return
      setOffset(null)
      setDecided(true)
      redraw((n) => n + 1)
      now.current.onSwipe(top, direction)
    }
    if (motion && el) {
      busy.current = true
      const thrown = motion.throwCard(el, direction)
      release.current = thrown.release
      void thrown.done.then(finish)
    } else finish()
    return true
  }

  const end = (event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const held = drag.current
    if (!held || held.id !== event.pointerId) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const far = Math.abs(held.x) >= SWIPE_DISTANCE_PX
    // A throw is judged by the last move only if the finger left right after it: held still, the card is not thrown.
    const speed = event.timeStamp - held.t <= SWIPE_FLICK.within ? held.speed : 0
    const flick = Math.abs(held.x) >= SWIPE_FLICK.distance && Math.abs(speed) >= SWIPE_FLICK.speed && Math.sign(speed) === Math.sign(held.x)
    if (!(commit && (far || flick) && decide(held.x < 0 ? "left" : "right"))) rest(event.currentTarget)
  }

  const toward: SwipeDirection | null = offset && Math.abs(offset.x) >= SWIPE_DISTANCE_PX ? (offset.x < 0 ? "left" : "right") : null

  return (
    <div data-slot="swipe-deck" role="group" aria-label={label} className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div data-slot="swipe-deck-stage" className="grid min-w-0">
        {top === undefined ? (
          <div ref={emptied} tabIndex={-1} data-slot="swipe-deck-empty" className="col-start-1 row-start-1 flex flex-col items-center justify-center p-4 text-sm text-ink-mute outline-hidden">
            {isEmptyNode(empty) ? words.empty : empty}
          </div>
        ) : (
          <>
            {next === undefined ? null : (
              <div key={getKey(next)} data-slot="swipe-deck-next" aria-hidden="true" inert className={CARD}>
                {children(next)}
              </div>
            )}
            <div
              key={topKey}
              ref={card}
              data-slot="swipe-deck-card"
              data-toward={toward ?? undefined}
              role="group"
              aria-label={getLabel(top)}
              aria-keyshortcuts="ArrowLeft ArrowRight"
              tabIndex={0}
              className={cn(CARD, "relative touch-pan-y select-none", offset ? "cursor-grabbing" : "cursor-grab", disabled && "cursor-default opacity-50", FOCUS_RING)}
              // The place under the finger: it is the gesture itself, so it is drawn at once, motion on or off.
              style={offset ? { translate: `${offset.x}px ${offset.y}px`, rotate: `${offset.x / 24}deg` } : undefined}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
                event.preventDefault()
                // One press, one card: a key held down does not go through the pile; nor does a key decide a card in hand.
                if (event.repeat || drag.current) return
                decide(event.key === "ArrowLeft" ? "left" : "right")
              }}
              onPointerDown={(event) => {
                if (disabled || busy.current || drag.current || event.button !== 0) return
                if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return
                drag.current = { id: event.pointerId, x0: event.clientX, y0: event.clientY, t: event.timeStamp, x: 0, speed: 0 }
                event.currentTarget.setPointerCapture?.(event.pointerId)
              }}
              onPointerMove={(event) => {
                const now = drag.current
                if (!now || now.id !== event.pointerId) return
                const x = event.clientX - now.x0
                const elapsed = event.timeStamp - now.t
                if (elapsed > 0) now.speed = (x - now.x) / elapsed
                now.x = x
                now.t = event.timeStamp
                // Up and down it gives a little, so the throw has an arc and the card does not leave its row.
                setOffset({ x, y: (event.clientY - now.y0) / 5 })
              }}
              onPointerUp={(event) => end(event, true)}
              onPointerCancel={(event) => end(event, false)}
              onLostPointerCapture={(event) => end(event, false)}
            >
              {children(top)}
              <span aria-hidden="true" className={cn(SIDE_WORD, "right-3", toward !== "left" && "invisible")}>
                {leftLabel}
              </span>
              <span aria-hidden="true" className={cn(SIDE_WORD, "left-3", toward !== "right" && "invisible")}>
                {rightLabel}
              </span>
            </div>
          </>
        )}
      </div>
      {/* Left and right are the sides of the gesture, whatever the direction of the text. */}
      <div data-slot="swipe-deck-actions" dir="ltr" className="flex items-center justify-center gap-2">
        <Button variant="outline" animated={animated} disabled={top === undefined || disabled} onClick={() => decide("left")}>
          <Icon name={leftIcon} />
          {leftLabel}
        </Button>
        <Button variant="outline" animated={animated} disabled={top === undefined || disabled} onClick={() => decide("right")}>
          {rightLabel}
          <Icon name={rightIcon} />
        </Button>
      </div>
      <span role="status" data-slot="swipe-deck-status" className="sr-only">
        {decided ? words.left(items.length) : ""}
      </span>
    </div>
  )
}

export { SwipeDeck }
