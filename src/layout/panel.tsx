// A panel: the inner layout of a region of the frame (the content, the inspector), as Imago's `im-panel` and Xiox's
// list are laid out. A header with the title, a line beside it that says how much is there («70 items · 8 selected»)
// and the tools of the whole panel at its end (a filter, a switch); under it a row of tools (a search, «Fold all»);
// then the body, which alone scrolls; and a foot that stays in sight (the actions on what is in the panel).
// Every part is optional but the title. The panel paints nothing: it lies on the surface of the region that holds it
// (the page, or the sheet of `AppShell frame="sheet"`), and only the foot has a line above it (R4). It is a region
// named by its title, so a screen reader can jump to it.
import * as React from "react"
import { cn } from "../lib/utils"

export type PanelProps = {
  /** The name of the panel: its heading and the name of its region. */
  title: string
  /** Beside the title, quieter: how much is there, what is chosen. */
  subtitle?: React.ReactNode
  /** At the end of the header: the tools of the whole panel (a filter, a switch). */
  actions?: React.ReactNode
  /** A row under the header: a search, a «Fold all». */
  tools?: React.ReactNode
  /** Under the body, always in sight: the actions on what the panel holds, the primary one last. */
  footer?: React.ReactNode
  /** The level of the heading: 2 (the default), or 3 for a panel inside a region that has its own heading. */
  level?: 2 | 3 | undefined
  className?: string | undefined
  /** The body: it scrolls by itself. */
  children?: React.ReactNode
}

/** A titled region with a header, a row of tools, a body that scrolls and a foot that stays. */
function Panel({ title, subtitle, actions, tools, footer, level = 2, className, children }: PanelProps) {
  const id = React.useId()
  const Heading = level === 3 ? "h3" : "h2"
  return (
    <section data-slot="panel" aria-labelledby={id} className={cn("flex h-full min-h-0 flex-col", className)}>
      <div data-slot="panel-header" className="flex min-h-(--row-height) shrink-0 items-center gap-2 px-4 pt-2">
        <Heading id={id} data-slot="panel-title" className="shrink-0 truncate text-sm font-semibold text-ink">
          {title}
        </Heading>
        {subtitle ? (
          <span data-slot="panel-subtitle" className="min-w-0 flex-1 truncate text-xs text-ink-mute">
            {subtitle}
          </span>
        ) : (
          <span aria-hidden="true" className="flex-1" />
        )}
        {actions ? (
          <div data-slot="panel-actions" className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {tools ? (
        <div data-slot="panel-tools" className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-2">
          {tools}
        </div>
      ) : null}
      <div data-slot="panel-body" className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
      {footer ? (
        <div data-slot="panel-footer" className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-4 py-2">
          {footer}
        </div>
      ) : null}
    </section>
  )
}

export { Panel }
