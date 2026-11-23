// Two panes in the content region: a column of fixed width at the start with the list the thing is chosen from, and
// beside it the thing chosen, read or worked on in the room that is left (a mail client's messages and the message, a
// file browser's tree and the file). The frame's inspector is for the details or the form of what is selected, in
// 300px; this is for when the thing chosen is the work itself and needs the width.
// - Each pane scrolls by itself; a hairline at the column's inner edge parts them (R4: a line, not a box).
// - It measures its own width, as the frame does, never the screen's: with less room than the column and as much
//   again for the other pane (`step`, by default twice the column), one pane is on screen at a time, the one `show`
//   names. The other stays in the page, hidden, so the way back finds the list as it was left. The app is told when
//   the form changes (`onPanesChange`): with one pane it shows its own way back to the list (a «back» button in the bar).
// - Without a way to measure (a server, a test) it has its two panes, as the frame is the wide one.
// The column's widths are steps of the scale: `sm` 240px, `md` 320px, `lg` 360px (a column of messages with a line of
// each under the sender).
import * as React from "react"
import { cn } from "../../lib/utils"

// Whole class names, so that Tailwind finds them in this file.
const WIDTH = { sm: "w-60", md: "w-80", lg: "w-90" } as const
const PX: Record<keyof typeof WIDTH, number> = { sm: 240, md: 320, lg: 360 }

export type ContentSplitProps = {
  /** The column at the start: the list the thing is chosen from. */
  aside: React.ReactNode
  /** The column's name for screen readers («Messages», «Files»): it is a region of its own. */
  asideLabel: string
  /** The column's width: `sm` 240px, `md` 320px (the default), `lg` 360px. */
  width?: keyof typeof WIDTH | undefined
  /** The pane on screen when only one fits: the column (`aside`, the default) or the thing chosen (`main`). */
  show?: "aside" | "main" | undefined
  /** The width of the split, in px, under which one pane shows at a time. Absent: twice the column's width. 0: always two. */
  step?: number | undefined
  /** The form changed: 2 panes side by side, or 1 at a time. Told once at first, when the split has measured itself. */
  onPanesChange?: ((panes: 1 | 2) => void) | undefined
  /** The other pane: the thing chosen, in the room that is left. */
  children?: React.ReactNode
}

/** A column of fixed width with a list, and the thing chosen beside it; one at a time where the two do not fit. */
function ContentSplit({ aside, asideLabel, width = "md", show = "aside", step, onPanesChange, children }: ContentSplitProps) {
  const root = React.useRef<HTMLDivElement>(null)
  const [panes, setPanes] = React.useState<1 | 2>(2)
  const below = step ?? PX[width] * 2
  React.useLayoutEffect(() => {
    const el = root.current
    if (!el || typeof ResizeObserver === "undefined") return
    const read = (measured: number) => {
      // A split not laid out yet measures nothing: the two panes stay.
      if (measured <= 0) return
      setPanes(measured < below ? 1 : 2)
    }
    read(el.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) read(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [below])
  // The app hears of the form after it is drawn, and only when it changes.
  const told = React.useRef<1 | 2 | null>(null)
  const tell = React.useRef(onPanesChange)
  tell.current = onPanesChange
  React.useEffect(() => {
    if (told.current === panes) return
    told.current = panes
    tell.current?.(panes)
  }, [panes])
  const one = panes === 1
  return (
    <div ref={root} data-slot="content-split" data-panes={panes} data-show={one ? show : undefined} className="flex h-full min-h-0 min-w-0">
      <div
        role="region"
        aria-label={asideLabel}
        data-slot="content-split-aside"
        hidden={one && show !== "aside"}
        className={cn("min-h-0 overflow-y-auto", one ? "min-w-0 flex-1" : cn(WIDTH[width], "shrink-0 border-e border-line"))}
      >
        {aside}
      </div>
      <div data-slot="content-split-main" hidden={one && show !== "main"} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export { ContentSplit }
