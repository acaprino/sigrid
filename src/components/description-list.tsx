// The facts of one thing as names and values, in two columns: the names in the muted ink at the start, the values in
// the ink beside them, one fact a line (the details of an item in an inspector: its name, its level, its path). It is a
// `<dl>`, so a screen reader reads each name with its value. A value that is code, a path or an id is set in the
// monospace face and broken anywhere, so a long one wraps in a narrow inspector instead of widening it.
import * as React from "react"
import { cn } from "../lib/utils"

/** One fact: its name and its value. */
export type DescriptionItem = {
  /** What the fact is («Level»). */
  name: React.ReactNode
  /** What it is worth («Recommended»). */
  value: React.ReactNode
  /** The value is code, a path or an id: the monospace face, broken anywhere. */
  code?: boolean | undefined
}

export type DescriptionListProps = {
  /** The facts, in the order they are read. A fact may be left out with `null` or `false`. */
  items: readonly (DescriptionItem | null | false | undefined)[]
  /** Its name for screen readers, where the heading above it does not name it. */
  "aria-label"?: string | undefined
}

/** Names and values, side by side: the facts of one thing. */
function DescriptionList({ items, "aria-label": label }: DescriptionListProps) {
  return (
    <dl aria-label={label} data-slot="description-list" className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
      {items.map((item, at) =>
        item ? (
          <React.Fragment key={at}>
            <dt className="text-ink-mute">{item.name}</dt>
            <dd className={cn("m-0 min-w-0 text-ink", item.code && "font-mono text-xs break-all")}>{item.value}</dd>
          </React.Fragment>
        ) : null,
      )}
    </dl>
  )
}

export { DescriptionList }
