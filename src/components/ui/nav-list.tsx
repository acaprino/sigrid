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

type Tone = "page" | "sidebar"
const ToneContext = React.createContext<Tone>("page")

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

// On the current row a count takes the row's own ink: the muted ink is not checked against the selection tint.
const ROW = "flex min-h-(--row-height) w-full items-center gap-2 rounded-md px-(--row-pad) text-start text-sm pointer-coarse:min-h-11 aria-[current=page]:[&_[data-slot=count]]:text-current"
const TONES: Record<Tone, string> = {
  page: "text-ink-soft hover:bg-paper-2 aria-[current=page]:bg-selected aria-[current=page]:font-semibold aria-[current=page]:text-selected-ink",
  sidebar: "text-sidebar-ink hover:bg-sidebar-selected/60 aria-[current=page]:bg-sidebar-selected aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-selected-ink",
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
  const shared = {
    "data-slot": "nav-item",
    "aria-current": current ? ("page" as const) : undefined,
    className: cn(ROW, TONES[tone], FOCUS_RING_INSET, "disabled:pointer-events-none disabled:opacity-50", className),
  }
  const content = (
    <>
      <span data-slot="nav-item-icon" aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span data-slot="nav-item-label" className="min-w-0 flex-1 truncate">
        {children}
      </span>
      {end}
    </>
  )
  return (
    <li data-slot="nav-item-row">
      {props.href !== undefined ? (
        <a {...props} {...shared}>
          {content}
        </a>
      ) : (
        <button type="button" {...props} {...shared}>
          {content}
        </button>
      )}
    </li>
  )
}

export { NavItem, NavList }
