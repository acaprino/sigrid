// A hairline between two groups of a page or a panel, in the divider's colour: what tells two groups apart where the
// space between them is not enough («Lines and space, not boxes», docs/design-laws.md). It is a horizontal rule, read
// by screen readers as a separator, and takes no room of its own: the pile around it spaces it. With `label` it breaks
// the line around a short caption («Today», «or»). The separators of a bar and of a menu are their own
// (`ToolbarSeparator`, `DropdownMenuSeparator`).
import * as React from "react"
import { isEmptyNode } from "../lib/utils"

export type SeparatorProps = {
  /** Only a drawing (between two groups that are already told apart for a screen reader): hides the rule from screen readers while keeping any visible `label` readable. */
  decorative?: boolean | undefined
  /** A short caption set in the line («Today», «or»). Absent: a plain hairline. */
  label?: React.ReactNode
  /** Where `label` sits along the line: `center` (the default) or `start`. */
  align?: "center" | "start" | undefined
}

/** A line across its place, between two groups, with an optional caption. */
function Separator({ decorative = false, label, align = "center" }: SeparatorProps) {
  const labelId = React.useId()
  if (isEmptyNode(label)) {
    return <hr data-slot="separator" aria-hidden={decorative || undefined} className="m-0 w-full shrink-0 border-0 border-t border-line" />
  }
  return (
    <div
      data-slot="separator"
      role={decorative ? undefined : "separator"}
      aria-labelledby={decorative ? undefined : labelId}
      className="flex w-full shrink-0 items-center gap-3 text-2xs font-medium text-ink-mute"
    >
      {align === "center" ? <span aria-hidden="true" className="h-px flex-1 bg-line" /> : null}
      <span id={labelId} data-slot="separator-label" className="shrink-0">
        {label}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  )
}

export { Separator }
