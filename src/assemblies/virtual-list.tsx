// A long list of which only the rows in sight are in the page: ten thousand messages cost what thirty do. The rows
// are the toolkit's own (`ItemRow`, or any `<li>`); this part is the box that scrolls and the choice of which rows to
// draw, on TanStack Virtual (`@tanstack/react-virtual`, an npm dependency, pinned: THIRD_PARTY.md). It has its own
// entry of the package (`./virtual`), so an app with short lists does not load the library.
// - The rows of a list are all as tall as each other, so one of them is measured as it is drawn and the rest follow:
//   any density holds, and so do the 44px of a finger. `estimateSize` is only where the first paint starts from.
// - The room of the rows not drawn is kept as padding, so the scrollbar is the one of the whole list.
// - With `variable` the rows are not all as tall (messages of a thread, a few lines or a screenful): each row is
//   measured as it is drawn and watched, so a row that grows (an answer being written, an image that arrives) moves
//   the ones after it. `estimateSize` is then the height of a row not yet seen, and the scrollbar is as honest as the
//   rows seen so far allow.
// - For screen readers it is a list that says how many items it holds and where each one is (`aria-setsize`,
//   `aria-posinset`): what is not drawn is still counted.
// The box needs a height: `fill` makes it as tall as the region that holds it (the content, a pane of `ContentSplit`),
// as `Empty fill` and `Page fit` are, so an app writes no class for it; beside other parts in a `Column fill` it takes
// what they leave. `pad` is the room inside the box, around the rows, a step of the scale.
import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "../lib/utils"
import type { Space } from "../primitives/layout"

// Whole class names, so that Tailwind finds them in this file.
const PAD: Record<Space, string> = { xs: "p-1", sm: "p-2", md: "p-3", lg: "p-4", xl: "p-6", "2xl": "p-8", "3xl": "p-12", "4xl": "p-16" }

export type VirtualListProps = {
  /** Name of the list for screen readers («Messages»). */
  "aria-label": string
  /** How many rows the list holds. */
  count: number
  /** The row at a place, counted from 0: an `ItemRow`, or any `<li>`. One element for each place, never none. */
  children: (index: number) => React.ReactNode
  /** What tells the row at a place from the others, where the rows move: its id. Absent: its place. */
  rowKey?: ((index: number) => React.Key) | undefined
  /** The height of a row in px before one is measured. Default 44. */
  estimateSize?: number | undefined
  /** The rows are of different heights, so each one is measured, not just the first (a thread of messages). Default: all as tall as the first. */
  variable?: boolean | undefined
  /** How many rows are drawn beyond the ones in sight, on each side. Default 8. */
  overscan?: number | undefined
  /** As tall as the region that holds it, which gives it its height (the content of the frame, a pane): the box scrolls, not the region. */
  fill?: boolean | undefined
  /** The room inside the box, around the rows: 4, 8, 12, 16 or 24px. Absent: none. */
  pad?: Space | undefined
  /** Classes of the box that scrolls: its height, where it is not `fill`. */
  className?: string | undefined
}

/** The gap between two rows of a list, in px: `gap-0.5`, as `ItemList`. */
const GAP = 2

export type VirtualRowsOptions = {
  count: number
  rowKey?: ((index: number) => React.Key) | undefined
  estimateSize: number
  overscan: number
  variable: boolean
  /** The room in px between two rows, which the element holding them lays out (`gap-*`). */
  gap?: number | undefined
  /** The room in px before the first row and after the last one, which the box keeps (the padding of the rows' holder is only at the sides). */
  edge?: number | undefined
}

/**
 * The choice of rows that are drawn, shared by the list and by a thread of messages (`VirtualConversation`): the
 * box that scrolls, the element that holds the rows, and the room kept for the rows not drawn. The rows of a holder
 * are all as tall as the first one, which is read where it is drawn (any density holds, so do a finger's 44px), or,
 * with `variable`, each one is measured and watched.
 */
export function useVirtualRows<Holder extends HTMLElement = HTMLElement>({ count, rowKey, estimateSize, overscan, variable, gap = GAP, edge = 0 }: VirtualRowsOptions) {
  const box = React.useRef<HTMLDivElement>(null)
  const list = React.useRef<Holder>(null)
  const [size, setSize] = React.useState(estimateSize)
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => box.current,
    estimateSize: () => (variable ? estimateSize : size + gap),
    overscan,
    ...(variable ? { gap } : {}),
    ...(edge > 0 ? { paddingStart: edge, paddingEnd: edge } : {}),
    // A row measured keeps its height where it moves: by its id, not its place.
    ...(variable && rowKey ? { getItemKey: rowKey } : {}),
  })
  const drawn = virtualizer.getVirtualItems()
  React.useLayoutEffect(() => {
    const rows = Array.from(list.current?.children ?? []) as HTMLElement[]
    if (variable) {
      // Each row is told its place and is measured where it is, and watched: the library keeps what it measured.
      virtualizer.measureElement(null)
      rows.forEach((row, at) => {
        const item = drawn[at]
        if (!item) return
        row.setAttribute("data-index", String(item.index))
        virtualizer.measureElement(row)
      })
      return
    }
    // The height of the layout, not the one drawn: a list in a preview that is scaled down has rows as tall as ever.
    const height = rows[0]?.offsetHeight ?? 0
    if (height > 0 && height !== size) setSize(height)
  })
  React.useLayoutEffect(() => {
    if (!variable) virtualizer.measure()
  }, [size, variable, virtualizer])
  const first = drawn[0]
  const last = drawn[drawn.length - 1]
  const room = { paddingTop: first ? first.start : 0, paddingBottom: last ? Math.max(0, virtualizer.getTotalSize() - last.end) : 0 }
  return { box, list, virtualizer, drawn, room }
}

function VirtualList({ count, children, rowKey, estimateSize = 44, variable = false, overscan = 8, fill = false, pad, className, ...props }: VirtualListProps) {
  const { box, list, drawn, room } = useVirtualRows<HTMLUListElement>({ count, rowKey, estimateSize, overscan, variable })
  // Each row is told its place in the whole list: written on the `<li>` itself, whatever component drew it.
  React.useLayoutEffect(() => {
    const rows = Array.from(list.current?.children ?? []) as HTMLElement[]
    rows.forEach((row, at) => {
      const item = drawn[at]
      if (!item) return
      row.setAttribute("aria-setsize", String(count))
      row.setAttribute("aria-posinset", String(item.index + 1))
    })
  })
  return (
    <div ref={box} data-slot="virtual-list" data-fill={fill || undefined} data-variable={variable || undefined} className={cn("overflow-y-auto", fill && "h-full min-h-0 flex-1", pad && PAD[pad], className)}>
      <ul ref={list} role="list" {...props} className="flex flex-col gap-0.5" style={room}>
        {drawn.map((item) => (
          <React.Fragment key={rowKey ? rowKey(item.index) : item.index}>{children(item.index)}</React.Fragment>
        ))}
      </ul>
    </div>
  )
}

export { VirtualList }
