// The hover background of a list, as one sheet that follows the pointer: with motion on it glides from the row the
// pointer left to the row it is on, between rows of different heights too, and fades when the pointer leaves the list
// or the list scrolls under it. It is for a list whose rows are the app's own (the rows of `ItemList` have it by
// themselves, with `animated`): the app gives it the element that holds the rows and how a row is found, and draws it
// inside that element. It is the tint of every row under the pointer (`ROW_HIGHLIGHT`), with the corners of the row it
// is under, and it lies under the rows: it never takes the pointer from them, and a row with a fill of its own (the
// chosen one) covers it. A mouse or a pen only: a finger has no hover.
// It never adds to what its holder can scroll: it is placed and sized from the last measure, and a holder that narrows
// (a panel that gives room to an inspector) leaves it wider than the holder until the next measure, and a glide that
// starts from the size it was seen at keeps it wider for a while after. So while it is at work the holder clips what
// sticks out of it sideways (`overflow-x: clip`, which makes no scroller and no scrollbar), unless it scrolls sideways by itself.
// While it is at work the holder carries `data-hover-follow`, and only then: a row drops its own hover fill under that
// attribute, and keeps it without motion (the setting off, the system asking for less, the chunk not here yet), where
// this part draws nothing and the list is exactly as it was.
import * as React from "react"
import { useMotion } from "../internal/motion"
import { ROW_HIGHLIGHT_FILL } from "../lib/rows"
import { cn } from "../lib/utils"

/** On the element that holds the rows, while one background follows the pointer over them: a row then has no hover fill of its own. */
const HOVER_FOLLOW_ATTR = "data-hover-follow"

export type HoverFollowProps = {
  /** The element that holds the rows (from a `ref` kept in state, so it is known once it is in the page). It may scroll, or sit in what scrolls. */
  container: HTMLElement | null
  /** How a row is found inside it: a CSS selector (`[data-row]`). Rows may come and go. */
  rows: string
  /** The element it is drawn as: `li` when the holder is a `<ul>` or an `<ol>`, which may hold nothing else. */
  as?: "div" | "li" | undefined
  /** The background follows the pointer (off by default, never with prefers-reduced-motion). Absent: what `MotionProvider` says. */
  animated?: boolean | undefined
}

/**
 * One hover background for the rows of `container`. Draw it inside `container`, after the rows. Without motion it
 * draws nothing and marks nothing.
 */
function HoverFollow({ container, rows, as = "div", animated }: HoverFollowProps) {
  const motion = useMotion(animated)
  const live = motion !== null
  // The background is placed from the holder's corner and lies under its rows: the holder is what it is placed in,
  // and a layer of its own, so "under the rows" is never "under the page"; and what it draws wider than the holder is
  // clipped, so it never makes the holder (or what scrolls it) scroll sideways. All are taken back with the motion.
  React.useLayoutEffect(() => {
    if (!live || !container) return
    const before = { position: container.style.position, isolation: container.style.isolation, overflowX: container.style.overflowX }
    const seen = getComputedStyle(container)
    if (seen.position === "static") container.style.position = "relative"
    container.style.isolation = "isolate"
    if (seen.overflowX === "visible" || seen.overflowX === "") container.style.overflowX = "clip"
    container.setAttribute(HOVER_FOLLOW_ATTR, "")
    return () => {
      container.style.position = before.position
      container.style.isolation = before.isolation
      container.style.overflowX = before.overflowX
      container.removeAttribute(HOVER_FOLLOW_ATTR)
    }
  }, [live, container])
  return motion ? <motion.HoverHighlight container={container} selector={rows} as={as} className={cn("absolute -z-10", ROW_HIGHLIGHT_FILL)} /> : null
}

export { HoverFollow }
