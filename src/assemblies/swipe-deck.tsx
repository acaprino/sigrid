// A deck of cards decided one at a time, each to one of two sides: keep or skip, approve or refuse, now or later.
// One card, one decision: nothing else on the screen asks for attention while a pile is sorted.
// Three ways to decide, all the same decision: drag the card past a third of the way (or flick it) and let go; press
// the left or right arrow with the card in focus; or press one of the two buttons under the deck, which are always
// there and never move (R14), so nothing depends on a gesture. While the card is dragged far enough, the word of the
// side it would go to shows on it: what letting go will do is said before it is done.
// The deck keeps nothing: the app holds the cards (`items`, the first is on top) and takes the decided one out when
// `onSwipe` tells it; to take a decision back it puts the card first again (an `Undo` in a notice, `Toasts`). A card
// the app leaves in comes back to its place.
// The card follows the finger at once (that is the gesture, not an animation); thrown, it leaves with a movement only
// when motion is on (`animated`, or `MotionProvider`). The next card lies under the top one, still: the flat page has
// no stack that zooms.
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
/** A quicker throw decides from nearer: at least this far, in px, and this fast, in px per millisecond. */
export const SWIPE_FLICK = { distance: 24, speed: 0.5 } as const

export type SwipeDeckProps<T> = {
  /** The cards still to decide; the first is on top. The app takes a card out when it is decided. */
  items: readonly T[]
  /** What tells a card from the others. */
  getKey: (item: T) => string
  /** The card's name for screen readers (its title). */
  getLabel: (item: T) => string
  /** What a card shows: laid out with the toolkit's parts (`Heading`, `Text`, `DescriptionList`). */
  children: (item: T) => React.ReactNode
  /** A card was decided: the app takes it out of `items` (and offers Undo in a notice). */
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
  /** The thrown card leaves with a movement. Absent: as `MotionProvider` says. */
  animated?: boolean | undefined
  className?: string | undefined
}

const CARD = "col-start-1 row-start-1 flex min-w-0 flex-col gap-3 rounded-lg bg-raised p-4 text-sm text-ink shadow-sm"
const SIDE_WORD = "absolute top-3 rounded-md bg-ink px-2 py-1 text-xs font-semibold text-paper"
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
  const drag = React.useRef<Drag | null>(null)
  const [offset, setOffset] = React.useState<{ x: number; y: number } | null>(null)
  // Nothing is announced before the first decision.
  const [decided, setDecided] = React.useState(false)
  const [, redraw] = React.useState(0)
  const busy = React.useRef(false)
  const release = React.useRef<(() => void) | null>(null)
  const hadFocus = React.useRef(false)

  // Once the deck is drawn again after a decision, the thrown card (gone, or left in by the app) is let go of.
  React.useLayoutEffect(() => {
    release.current?.()
    release.current = null
  })
  // The next card takes the focus the decided one had.
  React.useEffect(() => {
    if (!hadFocus.current) return
    hadFocus.current = false
    card.current?.focus()
  }, [topKey])

  const decide = async (direction: SwipeDirection) => {
    if (top === undefined || disabled || busy.current) return
    busy.current = true
    const el = card.current
    hadFocus.current = el !== null && el.ownerDocument.activeElement === el
    if (motion && el) {
      const thrown = motion.throwCard(el, direction)
      await thrown.done
      release.current = thrown.release
    }
    busy.current = false
    setOffset(null)
    setDecided(true)
    redraw((n) => n + 1)
    onSwipe(top, direction)
  }

  const end = (event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const now = drag.current
    if (!now || now.id !== event.pointerId) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const far = Math.abs(now.x) >= SWIPE_DISTANCE_PX
    const flick = Math.abs(now.x) >= SWIPE_FLICK.distance && Math.abs(now.speed) >= SWIPE_FLICK.speed && Math.sign(now.speed) === Math.sign(now.x)
    if (commit && (far || flick)) void decide(now.x < 0 ? "left" : "right")
    else setOffset(null)
  }

  const toward: SwipeDirection | null = offset && Math.abs(offset.x) >= SWIPE_DISTANCE_PX ? (offset.x < 0 ? "left" : "right") : null

  return (
    <div data-slot="swipe-deck" role="group" aria-label={label} className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div data-slot="swipe-deck-stage" className="grid min-w-0">
        {top === undefined ? (
          <div data-slot="swipe-deck-empty" className="col-start-1 row-start-1 flex flex-col items-center justify-center p-4 text-sm text-ink-soft">
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
              className={cn(CARD, "relative touch-pan-y select-none", offset ? "cursor-grabbing" : "cursor-grab", disabled && "cursor-default", FOCUS_RING)}
              // The place under the finger: it is the gesture itself, so it is drawn at once, motion on or off.
              style={offset ? { translate: `${offset.x}px ${offset.y}px`, rotate: `${offset.x / 24}deg` } : undefined}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
                event.preventDefault()
                void decide(event.key === "ArrowLeft" ? "left" : "right")
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
      <div data-slot="swipe-deck-actions" className="flex items-center justify-center gap-2">
        <Button variant="outline" disabled={top === undefined || disabled} onClick={() => void decide("left")}>
          <Icon name={leftIcon} />
          {leftLabel}
        </Button>
        <Button variant="outline" disabled={top === undefined || disabled} onClick={() => void decide("right")}>
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
