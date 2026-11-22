// The rows of a navigation (R1 and R6 of the owner's rules): a list of places, each a row with an icon slot, a name
// and, at the end, whatever the caller adds (a `Count`). The row of the place the user is in carries
// `aria-current="page"`, the selection tint and stronger text; no rail and no bar (R1). The icon slot is always there,
// 16px wide, so a row without an icon stays aligned with the others (R6). A row is as tall as the density's row, and
// at least 44px with a coarse pointer.
// Two tones: `page` (the default) for a list on the page or on a raised sheet, `sidebar` for a list on the app's
// sidebar, where the theme has its own ink and its own selection (`sidebar-*`, the solid sidebar among them).
import * as React from "react"
import { cn } from "../../lib/utils"
import { FOCUS_RING_INSET } from "../../lib/focus"
import { Tooltip } from "./tooltip"

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
const ROW = "flex min-h-(--row-height) w-full items-center gap-2 rounded-md px-(--row-pad) text-start text-sm pointer-coarse:min-h-11 aria-[current=page]:[&_[data-slot=count]]:text-current"
const TONES: Record<Tone, string> = {
  page: "text-ink-soft hover:bg-selected/60 hover:text-ink aria-[current=page]:bg-selected aria-[current=page]:font-semibold aria-[current=page]:text-selected-ink",
  sidebar: "text-sidebar-ink hover:bg-sidebar-selected/70 hover:text-sidebar-selected-ink aria-[current=page]:bg-sidebar-selected aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-selected-ink",
}

type NavItemOwnProps = {
  /** This row is the place the user is in. */
  current?: boolean | undefined
  /** The icon (an `Icon`): without one the slot stays, empty. */
  icon?: React.ReactNode
  /** What follows the name, at the end of the row: a `Count`. */
  end?: React.ReactNode
  className?: string | undefined
  children?: React.ReactNode
}

/** A row that acts in the page (`onClick`), or, with `href`, a link. */
export type NavItemProps = NavItemOwnProps &
  (
    | ({ href?: undefined } & Omit<React.ComponentPropsWithRef<"button">, keyof NavItemOwnProps | "type">)
    | ({ href: string } & Omit<React.ComponentPropsWithRef<"a">, keyof NavItemOwnProps>)
  )

function NavItem({ current = false, icon, end, className, children, ...props }: NavItemProps) {
  const tone = React.useContext(ToneContext)
  const { rail, query } = React.useContext(NavContext)
  // The name of the row as text, for the search and for the hint of the rail: a row whose name is not plain text is
  // never hidden by a search, and has no hint.
  const name = typeof children === "string" ? children : undefined
  const shared = {
    "data-slot": "nav-item",
    "aria-current": current ? ("page" as const) : undefined,
    className: cn(ROW, TONES[tone], FOCUS_RING_INSET, "disabled:pointer-events-none disabled:opacity-50", rail && "justify-center px-0", className),
  }
  const content = (
    <>
      <span data-slot="nav-item-icon" aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center">
        {icon}
      </span>
      {/* On the rail the name stays for screen readers: the row is still named by it. */}
      <span data-slot="nav-item-label" className={rail ? "sr-only" : "min-w-0 flex-1 truncate"}>
        {children}
      </span>
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
      {rail && name !== undefined ? (
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
