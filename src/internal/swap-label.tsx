// A label that changes between two texts without changing its width: «Save» and «Saving…» on a busy button, «Copy»
// and «Copied» on the copy button. Both texts sit in one grid cell, the one not shown invisible and hidden from screen
// readers, so the cell is always as wide as the wider of the two and the controls beside it never move (the owner's
// rule: a control never moves between states). The sister of `steady-label.tsx`, which does the same for one text in
// two weights.
import * as React from "react"
import { cn } from "../lib/utils"

/** One layer of the cell: both on the same row and column, laid out like the button's own content. */
const LAYER = "col-start-1 row-start-1 inline-flex items-center gap-2"

export type SwapLabelProps = {
  /** The text at rest. */
  first: React.ReactNode
  /** The text that takes its place. */
  second: React.ReactNode
  /** Which of the two is shown. */
  showSecond: boolean
  /** Where each text sits when it is the narrower: in the middle (a button's label) or at the start (beside an icon). */
  align?: "center" | "start" | undefined
  /** The `data-slot` of the cell, for the part that holds it. */
  slot?: string | undefined
}

/** The two texts in one cell: the one shown, and the other keeping its room. */
export function SwapLabel({ first, second, showSecond, align = "center", slot }: SwapLabelProps) {
  const layer = cn(LAYER, align === "center" ? "justify-center" : "justify-start")
  return (
    <span data-slot={slot} className="grid">
      <span className={cn(layer, showSecond && "invisible")} aria-hidden={showSecond || undefined}>
        {first}
      </span>
      <span className={cn(layer, !showSecond && "invisible")} aria-hidden={!showSecond || undefined}>
        {second}
      </span>
    </span>
  )
}
