// One line of items (the details under a title, a row of labels) that never grows: what does not fit is cut from the
// end, whole, and counted after the line («+2»). It never wraps to a second line and the first item always stays.
// Other libraries call it an overflow list; this one is CSS and one `ResizeObserver`:
// - the box is a flex row that wraps, one row tall, with `overflow: clip`: what does not fit wraps onto a row that is
//   not shown. `clip` and not `hidden`: the box is no scroll container, so focus can never scroll the line.
// - the items that sit below the first one are the cut ones. They are counted when the items are drawn, again when the
//   box changes size, and again when the fonts are ready (a font that comes late changes the widths, not the box).
// - a cut item is `inert` and invisible: no focus, no press, and screen readers skip it, as the eye does. So the cue is
//   for both: «+2» to the eye, «2 more» to a screen reader (`words.list.more`). What is cut must also be found where
//   the whole item is (its page, its details).
// The caller gives the box its height in `className`: one row of its items (`h-5` for labels 20px tall), with the gap
// and the text. Each child is one item: one element (a bare text is not counted: put it in a `<span>`). A first item
// wider than the line is cut at the line's end: give it `min-w-0 truncate` for an ellipsis.
// Its boxes are spans, so it also sits inside a button or a row's line. Without layout (jsdom, a server) nothing is
// cut, and nothing moves.
import * as React from "react"
import { cn } from "../../lib/utils"
import { useWords } from "../../words"

export type OverflowListProps = {
  /** The items, in their order: one element each. What does not fit is cut from the end. */
  children?: React.ReactNode
  /** Classes of the box that holds the items: its height (one row of the items, `h-5`), the gap, the text. */
  className?: string | undefined
  /** What stands after the line when items are cut, from how many they are. Default: «+2», read «2 more». */
  cue?: ((hidden: number) => React.ReactNode) | undefined
}

/** The mark of a cut item, beside its `inert`: the box hides what carries it. */
const CUT = "data-cut"

const BOX = "flex min-w-0 flex-1 flex-wrap content-start items-center overflow-clip [&>[data-cut]]:invisible"

/** Marks the items that sit below the first one (they wrapped onto a row that is not shown) and says how many they are. */
function markCut(box: HTMLElement): number {
  const items = Array.from(box.children) as HTMLElement[]
  const first = items[0]
  if (!first) return 0
  // Below the first item's foot is a later row, whatever the alignment of the row. Without layout, nothing is.
  const foot = first.offsetTop + Math.max(first.offsetHeight, 1)
  // Every place is read before any mark is written: a mark between two reads would lay the page out again.
  const cut = items.map((item, at) => at > 0 && item.offsetTop >= foot)
  items.forEach((item, at) => {
    const out = cut[at] === true
    if (out === item.hasAttribute(CUT)) return
    item.toggleAttribute(CUT, out)
    // shortcut: an item the app made inert itself is let go when it comes back into view; keep the app's own if one needs it.
    item.toggleAttribute("inert", out)
  })
  return cut.filter(Boolean).length
}

function OverflowList({ children, className, cue }: OverflowListProps) {
  const words = useWords()
  const box = React.useRef<HTMLSpanElement>(null)
  const [hidden, setHidden] = React.useState(0)
  // After every drawing: the items may have changed.
  React.useLayoutEffect(() => {
    if (box.current) setHidden(markCut(box.current))
  })
  // Again when the box changes size, and when the fonts are ready.
  React.useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    let on = true
    const measure = () => {
      if (on) setHidden(markCut(el))
    }
    void document.fonts?.ready.then(measure)
    const watch = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    watch?.observe(el)
    return () => {
      on = false
      watch?.disconnect()
    }
  }, [])
  return (
    <span data-slot="overflow-list" className="flex min-w-0 flex-1 items-center gap-2">
      <span ref={box} data-slot="overflow-list-items" className={cn(BOX, className)}>
        {children}
      </span>
      {hidden > 0 ? (
        <span data-slot="overflow-list-cue" className={cn("shrink-0", !cue && "text-xs text-ink-mute tabular-nums")}>
          {cue ? (
            cue(hidden)
          ) : (
            <>
              <span aria-hidden="true">+{hidden}</span>
              <span className="sr-only">{words.list.more(hidden)}</span>
            </>
          )}
        </span>
      ) : null}
    </span>
  )
}

export { OverflowList }
