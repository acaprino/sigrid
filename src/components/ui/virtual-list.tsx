// A long list of which only the rows in sight are in the page: ten thousand messages cost what thirty do. The rows
// are the toolkit's own (`ItemRow`, or any `<li>`); this part is the box that scrolls and the choice of which rows to
// draw, on TanStack Virtual (`@tanstack/react-virtual`, an npm dependency, pinned: THIRD_PARTY.md). It has its own
// entry of the package (`./virtual`), so an app with short lists does not load the library.
// - The rows of a list are all as tall as each other, so one of them is measured as it is drawn and the rest follow:
//   any density holds, and so do the 44px of a finger. `estimateSize` is only where the first paint starts from.
// - The room of the rows not drawn is kept as padding, so the scrollbar is the one of the whole list.
// - For screen readers it is a list that says how many items it holds and where each one is (`aria-setsize`,
//   `aria-posinset`): what is not drawn is still counted.
// The box needs a height (`className="h-96"`, or a place in a column that gives it one).
import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "../../lib/utils"

export type VirtualListProps = {
  /** Name of the list for screen readers («Messages»). */
  "aria-label": string
  /** How many rows the list holds. */
  count: number
  /** The row at a place, counted from 0: an `ItemRow`, or any `<li>`. */
  children: (index: number) => React.ReactNode
  /** What tells the row at a place from the others, where the rows move: its id. Absent: its place. */
  rowKey?: ((index: number) => React.Key) | undefined
  /** The height of a row in px before one is measured. Default 44. */
  estimateSize?: number | undefined
  /** How many rows are drawn beyond the ones in sight, on each side. Default 8. */
  overscan?: number | undefined
  /** Classes of the box that scrolls: its height. */
  className?: string | undefined
}

/** The gap between two rows of a list, in px: `gap-0.5`, as `ItemList`. */
const GAP = 2

function VirtualList({ count, children, rowKey, estimateSize = 44, overscan = 8, className, ...props }: VirtualListProps) {
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
    const height = rows[0]?.getBoundingClientRect().height ?? 0
    if (height > 0 && Math.abs(height - size) > 0.01) setSize(height)
  })
  React.useLayoutEffect(() => virtualizer.measure(), [size, virtualizer])
  const first = drawn[0]
  const last = drawn[drawn.length - 1]
  return (
    <div ref={box} data-slot="virtual-list" className={cn("overflow-y-auto", className)}>
      <ul ref={list} role="list" {...props} className="flex flex-col gap-0.5" style={{ paddingTop: first ? first.start : 0, paddingBottom: last ? Math.max(0, virtualizer.getTotalSize() - last.end) : 0 }}>
        {drawn.map((item) => (
          <React.Fragment key={rowKey ? rowKey(item.index) : item.index}>{children(item.index)}</React.Fragment>
        ))}
      </ul>
    </div>
  )
}

export { VirtualList }
