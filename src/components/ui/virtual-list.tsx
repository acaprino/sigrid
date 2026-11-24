// A long list of which only the rows in sight are in the page: ten thousand messages cost what thirty do. The rows
// are the toolkit's own (`ItemRow`, or any `<li>`); this part is the box that scrolls and the choice of which rows to
// draw, on TanStack Virtual (`@tanstack/react-virtual`, an npm dependency, pinned: THIRD_PARTY.md). It has its own
// entry of the package (`./virtual`), so an app with short lists does not load the library.
// - The rows of a list are all as tall as each other, so one of them is measured as it is drawn and the rest follow:
//   any density holds, and so do the 44px of a finger. `estimateSize` is only where the first paint starts from.
// - The room of the rows not drawn is kept as padding, so the scrollbar is the one of the whole list.
// - For screen readers it is a list that says how many items it holds and where each one is (`aria-setsize`,
//   `aria-posinset`): what is not drawn is still counted.
// The box needs a height: `fill` makes it as tall as the region that holds it (the content, a pane of `ContentSplit`),
// as `Empty fill` and `Page fit` are, so an app writes no class for it; `pad` is the room inside the box, around the
// rows, a step of the scale.
import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "../../lib/utils"
import type { Space } from "./layout"

// Whole class names, so that Tailwind finds them in this file.
const PAD: Record<Space, string> = { xs: "p-1", sm: "p-2", md: "p-3", lg: "p-4", xl: "p-6" }

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

function VirtualList({ count, children, rowKey, estimateSize = 44, overscan = 8, fill = false, pad, className, ...props }: VirtualListProps) {
  const box = React.useRef<HTMLDivElement>(null)
  const list = React.useRef<HTMLUListElement>(null)
  const [size, setSize] = React.useState(estimateSize)
  const virtualizer = useVirtualizer({ count, getScrollElement: () => box.current, estimateSize: () => size + GAP, overscan })
  const drawn = virtualizer.getVirtualItems()
  // A row is measured where it is: with another density, or a finger, every row is as tall as the one found there.
  // And each row is told its place in the whole list: written on the `<li>` itself, whatever component drew it.
  React.useLayoutEffect(() => {
    const rows = Array.from(list.current?.children ?? []) as HTMLElement[]
    rows.forEach((row, at) => {
      const item = drawn[at]
      if (!item) return
      row.setAttribute("aria-setsize", String(count))
      row.setAttribute("aria-posinset", String(item.index + 1))
    })
    // The height of the layout, not the one drawn: a list in a preview that is scaled down has rows as tall as ever.
    const height = rows[0]?.offsetHeight ?? 0
    if (height > 0 && height !== size) setSize(height)
  })
  React.useLayoutEffect(() => virtualizer.measure(), [size, virtualizer])
  const first = drawn[0]
  const last = drawn[drawn.length - 1]
  return (
    <div ref={box} data-slot="virtual-list" data-fill={fill || undefined} className={cn("overflow-y-auto", fill && "h-full min-h-0", pad && PAD[pad], className)}>
      <ul ref={list} role="list" {...props} className="flex flex-col gap-0.5" style={{ paddingTop: first ? first.start : 0, paddingBottom: last ? Math.max(0, virtualizer.getTotalSize() - last.end) : 0 }}>
        {drawn.map((item) => (
          <React.Fragment key={rowKey ? rowKey(item.index) : item.index}>{children(item.index)}</React.Fragment>
        ))}
      </ul>
    </div>
  )
}

export { VirtualList }
