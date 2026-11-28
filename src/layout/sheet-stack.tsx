// A stack of sheets: a few pages of one flow (the steps of a sequence, the sides of a thing) of which one is open and
// the others wait at the foot as their heads, each with its name, a line of what is in it and a count. A press on a
// head brings that sheet up: it rises from its place at the foot and becomes the page, the page that was open fades
// where it is and its head takes a place at the foot. For two to four pages a person moves between many times a
// session, on a phone above all; more pages, or pages people rarely visit, are a `NavList` or `Tabs`.
//
// The app keeps which page is open (`value`) and draws it as the children. The rise is a view transition of the
// browser on the toolkit's spring (theme.css, «SheetStack»): only with motion on and not reduced, and only where the
// browser has view transitions; otherwise the page changes at once. The heads are buttons of a `nav`; the page is a
// region named by its head.
import * as React from "react"
import { flushSync } from "react-dom"

import { useMotionAllowed } from "../internal/motion"
import { cn } from "../lib/utils"
import { Count } from "../primitives/count"

export type SheetStackItem = {
  value: string
  /** The page's name: one or two words. */
  title: React.ReactNode
  /** One line of what waits in it («3 thoughts wait for a place»): cut with an ellipsis. */
  description?: React.ReactNode
  /** An icon before the name. */
  icon?: React.ReactNode
  /** How many things wait in it; nothing is drawn at zero. */
  count?: number | undefined
}

export type SheetStackProps = {
  /** Name of the heads for screen readers («Steps»). */
  "aria-label": string
  /** The pages, in their order: the heads at the foot keep it. */
  items: readonly SheetStackItem[]
  /** The open page. A value that is none of the items' (a page outside the flow) leaves every head at the foot. */
  value: string
  onValueChange: (value: string) => void
  /** The open page. */
  children: React.ReactNode
  /** The sheet pressed rises on the toolkit's spring (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
  className?: string | undefined
}

/** The marks of a rise, on the document root while it runs: theme.css reads them. */
const MOVING = "data-sheet-stack"

type Rise = { rise: string; sink: string | null; covered: boolean }

function SheetStack({ "aria-label": label, items, value, onValueChange, children, animated, className }: SheetStackProps) {
  const allowed = useMotionAllowed(animated)
  const id = React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const [move, setMove] = React.useState<Rise | null>(null)
  const heads = items.filter((item) => item.value !== value)
  const open = items.find((item) => item.value === value)
  const name = (of: string) => `sheet-${id}-${items.findIndex((item) => item.value === of)}`

  const pick = (next: string) => {
    const start = typeof document === "undefined" ? undefined : document.startViewTransition?.bind(document)
    if (!allowed || !start) {
      onValueChange(next)
      return
    }
    // A head that is not the last one at the foot is partly under the next: it rises from behind it.
    const rise: Rise = { rise: next, sink: open ? value : null, covered: heads.at(-1)?.value !== next }
    const root = document.documentElement
    // The names are on the old page before the browser takes its picture.
    flushSync(() => setMove(rise))
    root.setAttribute(MOVING, "")
    const transition = start(() => flushSync(() => onValueChange(next)))
    void transition.finished.finally(() => {
      root.removeAttribute(MOVING)
      setMove((now) => (now === rise ? null : now))
    })
  }

  // While a sheet rises: the page pressed is the rising sheet, the page left fades, every head keeps its own name.
  const pageMark: React.CSSProperties | undefined =
    move === null ? undefined : value === move.rise ? mark(name(value), "sigrid-sheet sigrid-sheet-rising") : value === move.sink ? mark(`sheet-${id}-left`, "sigrid-sheet-left") : undefined

  return (
    <div data-slot="sheet-stack" className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        role="region"
        aria-label={open && typeof open.title === "string" ? open.title : undefined}
        data-slot="sheet-stack-page"
        style={pageMark}
        className="min-h-0 flex-1 overflow-y-auto bg-paper"
      >
        {children}
      </div>
      <nav aria-label={label} data-slot="sheet-stack-heads" className="flex shrink-0 flex-col">
        {heads.map((item, index) => (
          <button
            key={item.value}
            type="button"
            data-slot="sheet-stack-head"
            style={move === null ? undefined : mark(name(item.value), cn("sigrid-sheet", move.rise === item.value && "sigrid-sheet-rising", move.rise === item.value && move.covered && "sigrid-sheet-covered"))}
            onClick={() => pick(item.value)}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-t-lg border-t border-line bg-raised px-4 py-2 text-start text-ink outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-ink-mute",
              // Each head lies a little on the one before it, as sheets in a pile do.
              index > 0 && "-mt-1.5",
            )}
          >
            {item.icon}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold">{item.title}</span>
              {item.description ? <span className="block truncate text-sm text-ink-mute">{item.description}</span> : null}
            </span>
            {item.count ? <Count value={item.count} rolling animated={animated} /> : null}
          </button>
        ))}
      </nav>
    </div>
  )
}

/** A part's name and classes for the view transition (`view-transition-class` is not in React's CSS types yet). */
function mark(name: string, classes: string): React.CSSProperties {
  return { viewTransitionName: name, viewTransitionClass: classes } as React.CSSProperties
}

export { SheetStack }
