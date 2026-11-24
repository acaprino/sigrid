// The rows of a navigation (R1 and R6 of the owner's rules): a list of places, each a row with an icon slot, a name
// and, at the end, whatever the caller adds (a `Count`). The row of the place the user is in carries
// `aria-current="page"`, the selection tint, stronger text and a short accent bar at its left edge (R1). The icon slot is always there,
// 16px wide, so a row without an icon stays aligned with the others (R6). A row is as tall as the density's row, and
// at least 44px with a coarse pointer.
// A row may have a second line under its name (`description`) and, beside it, controls of its own (`actions`: a button
// that adds to the place, a menu). The controls sit outside the row, which is itself a button or a link; the rail shows
// neither.
// Two tones: `page` (the default) for a list on the page or on a raised sheet, `sidebar` for a list on the app's
// sidebar, where the theme has its own ink and its own selection (`sidebar-*`, the solid sidebar among them).
import * as React from "react"
import { cn } from "../lib/utils"
import { FOCUS_RING_INSET } from "../lib/focus"
import { Tooltip } from "../primitives/tooltip"

type Tone = "page" | "sidebar"
/** The tone of the rows below: a `NavList` sets it, and so does a `Sidebar` (its rows are on the sidebar). */
export const ToneContext = React.createContext<Tone>("page")

/**
 * What a `Sidebar` tells its rows: `rail` when it is shrunk to its icons (a row then shows its icon alone, with its
 * name as a hint), and what is typed in its search box, in lower case (a row whose name does not hold it is hidden).
 */
export const NavContext = React.createContext<{ rail: boolean; query: string }>({ rail: false, query: "" })

export type NavListProps = {
  /** Name of the navigation for screen readers («Mail folders»). */
  "aria-label": string
  tone?: Tone | undefined
  className?: string | undefined
  children?: React.ReactNode
}

function NavList({ tone = "page", className, children, ...props }: NavListProps) {
  return (
    <nav data-slot="nav-list" data-tone={tone} {...props}>
      <ul role="list" className={cn("flex flex-col gap-0.5", className)}>
        <ToneContext.Provider value={tone}>{children}</ToneContext.Provider>
      </ul>
    </nav>
  )
}

// Under the pointer a row takes a lighter share of the selection tint and the stronger text: it is seen as the row
// about to be chosen, and stays below the chosen one, which has the whole tint and the semibold. (The page's `paper-2`
// was a fill one step from the page: in the dark it was darker than the page, and next to invisible.)
// On the current row a count takes the row's own ink: the muted ink is not checked against the selection tint.
// The chosen row has, with the tint, a short bar in the accent at its left edge; a count at the end of a row is a pill,
// in the accent on the chosen row and neutral on the others (the owner's design of 2026-11-22: before it, no bar and
// plain numbers).
/** A `Count` inside is a pill: its form. Its colours are the tone's (`COUNT_PILL_ON_SIDEBAR` on the sidebar). */
export const COUNT_PILL =
  "[&_[data-slot=count]]:min-w-5 [&_[data-slot=count]]:rounded-full [&_[data-slot=count]]:px-1.5 [&_[data-slot=count]]:py-0.5 [&_[data-slot=count]]:text-center [&_[data-slot=count]]:font-semibold"
/** The colours of that pill on the sidebar's surface, where the row is not the chosen one. */
export const COUNT_PILL_ON_SIDEBAR = "[&_[data-slot=count]]:bg-sidebar-ink/12 [&_[data-slot=count]]:text-sidebar-ink"

const ROW = cn(
  "relative flex min-h-(--row-height) w-full items-center gap-2 rounded-md px-(--row-pad) text-start text-sm pointer-coarse:min-h-11",
  "aria-[current=page]:before:absolute aria-[current=page]:before:top-1/2 aria-[current=page]:before:start-0 aria-[current=page]:before:h-4 aria-[current=page]:before:w-0.75 aria-[current=page]:before:-translate-y-1/2 aria-[current=page]:before:rounded-full aria-[current=page]:before:content-['']",
  COUNT_PILL,
)
const TONES: Record<Tone, string> = {
  page: "text-ink-soft hover:bg-selected/60 hover:text-ink aria-[current=page]:bg-selected aria-[current=page]:font-semibold aria-[current=page]:text-selected-ink aria-[current=page]:before:bg-primary [&_[data-slot=count]]:bg-ink/9 [&_[data-slot=count]]:text-ink-soft aria-[current=page]:[&_[data-slot=count]]:bg-primary aria-[current=page]:[&_[data-slot=count]]:text-primary-foreground",
  sidebar: `text-sidebar-ink hover:bg-sidebar-selected/70 hover:text-sidebar-selected-ink aria-[current=page]:bg-sidebar-selected aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-selected-ink aria-[current=page]:before:bg-sidebar-accent ${COUNT_PILL_ON_SIDEBAR} aria-[current=page]:[&_[data-slot=count]]:bg-sidebar-accent aria-[current=page]:[&_[data-slot=count]]:text-sidebar-accent-ink`,
}
// The second line of a row: the muted ink of its tone; on the chosen row, the row's own ink a step quieter (as in `ItemRow`).
const MUTE: Record<Tone, string> = { page: "text-ink-mute", sidebar: "text-sidebar-mute" }

type NavItemOwnProps = {
  /** This row is the place the user is in. */
  current?: boolean | undefined
  /** The icon (an `Icon`): without one the slot stays, empty. */
  icon?: React.ReactNode
  /** What follows the name, at the end of the row: a `Count`. */
  end?: React.ReactNode
  /** A second line under the name, in the muted ink: what the place holds, its state («4 sessions · 4 running»). Not on the rail. */
  description?: React.ReactNode
  /** Controls of the place (a button that adds to it, a menu), beside the row and outside it: the row is itself a button or a link. Not on the rail. */
  actions?: React.ReactNode
  className?: string | undefined
  children?: React.ReactNode
}

/** A row that acts in the page (`onClick`), or, with `href`, a link. */
export type NavItemProps = NavItemOwnProps &
  (
    | ({ href?: undefined } & Omit<React.ComponentPropsWithRef<"button">, keyof NavItemOwnProps | "type">)
    | ({ href: string } & Omit<React.ComponentPropsWithRef<"a">, keyof NavItemOwnProps>)
  )

function NavItem({ current = false, icon, end, description, actions, className, children, ...props }: NavItemProps) {
  const tone = React.useContext(ToneContext)
  const { rail, query } = React.useContext(NavContext)
  // The name of the row as text, for the search and for the hint of the rail: a row whose name is not plain text is
  // never hidden by a search, and has no hint.
  const name = typeof children === "string" ? children : undefined
  const twoLines = description !== undefined && !rail
  const withActions = actions !== undefined && !rail
  const shared = {
    "data-slot": "nav-item",
    "aria-current": current ? ("page" as const) : undefined,
    className: cn(ROW, TONES[tone], FOCUS_RING_INSET, "disabled:pointer-events-none disabled:opacity-50", rail && "justify-center px-0", twoLines && "py-1", withActions && "min-w-0 flex-1", className),
  }
  const content = (
    <>
      <span data-slot="nav-item-icon" aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center">
        {icon}
      </span>
      {twoLines ? (
        <span className="flex min-w-0 flex-1 flex-col">
          <span data-slot="nav-item-label" className="truncate">
            {children}
          </span>
          <span data-slot="nav-item-description" className={cn("truncate text-xs font-normal", current ? "opacity-80" : MUTE[tone])}>
            {description}
          </span>
        </span>
      ) : (
        // On the rail the name stays for screen readers: the row is still named by it.
        <span data-slot="nav-item-label" className={rail ? "sr-only" : "min-w-0 flex-1 truncate"}>
          {children}
        </span>
      )}
      {rail ? null : end}
    </>
  )
  const row =
    props.href !== undefined ? (
      <a {...props} {...shared}>
        {content}
      </a>
    ) : (
      <button type="button" {...props} {...shared}>
        {content}
      </button>
    )
  return (
    <li data-slot="nav-item-row" hidden={query !== "" && name !== undefined && !name.toLowerCase().includes(query)}>
      {withActions ? (
        // The controls are beside the row, not in it: a button cannot hold a button.
        <div className="flex items-center gap-1">
          {row}
          <div data-slot="nav-item-actions" className="flex shrink-0 items-center gap-0.5">
            {actions}
          </div>
        </div>
      ) : rail && name !== undefined ? (
        <Tooltip label={name} side="right">
          {row}
        </Tooltip>
      ) : (
        row
      )}
    </li>
  )
}

export { NavItem, NavList }
