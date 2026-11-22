// The sidebar of an app: its navigation as groups of rows (`NavItem`), on the theme's sidebar surface and inks
// (`sidebar-*`). It puts together pieces the toolkit already has, so an app does not assemble them by hand:
// - shrunk to a rail (`collapsed`) each row shows its icon alone, with its name as a hint beside it and still as its
//   name for screen readers; the button at the foot shrinks and widens it (`onCollapsedChange`);
// - groups (`SidebarGroup`): a heading with its icon (R6) and, if `collapsible`, an arrow that turns as the group opens;
//   the rows a user reaches most are simply the first group («Favorites»);
// - a search box at the top (`search`) hides, as the user types, the rows whose name does not hold the text, and the
//   groups left with no row; with nothing left it says so;
// - below 860px (the `md` of theme.css, where the sidebar stops being a column) it is a drawer from the left, a `Sheet`
//   the app opens from its own button (`open`, `onOpenChange`); choosing a row closes it.
// What sits above the groups (the app's name, a menu that changes workspace) and below them (the account) is the app's:
// `header` and `footer`. No rail or bar marks the current row: the selection tint does (R1).
import * as React from "react"
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "../../lib/utils"
import { FOCUS_RING_INSET } from "../../lib/focus"
import { GROUP_LABEL } from "../../lib/rows"
import { NARROW, useMedia } from "../../internal/media"
import { useMotion } from "../../internal/motion"
import { useWords } from "../../words"
import { NavContext, ToneContext } from "./nav-list"
import { SearchField } from "./search-field"
import { Sheet, SheetContent, SheetTitle } from "./sheet"
import { Tooltip } from "./tooltip"

export type SidebarProps = {
  /** Name of the navigation for screen readers («Main»); also the title of the drawer. */
  "aria-label": string
  /** Shrunk to a rail of icons. On a narrow window (the drawer) it is always wide. */
  collapsed?: boolean | undefined
  /** With it, a button at the foot shrinks and widens the sidebar. */
  onCollapsedChange?: ((collapsed: boolean) => void) | undefined
  /** Below 860px: the drawer is open. Above, the sidebar is always there and this is not read. */
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  /** Above the groups: the app's name, a menu that changes workspace. On the rail it is not shown. */
  header?: React.ReactNode
  /** Below the groups: the account, a link to the settings. On the rail it is not shown. */
  footer?: React.ReactNode
  /** A search box at the top that filters the rows as the user types. */
  search?: boolean | undefined
  /** The drawer slides in and the arrows of the groups turn (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
  className?: string | undefined
  children?: React.ReactNode
}

const SidebarContext = React.createContext<{ rail: boolean; query: string; animated: boolean | undefined }>({ rail: false, query: "", animated: undefined })

// A control of the sidebar that is not a row of the navigation: the heading of a group that opens, the button at the foot.
const CONTROL = cn(
  "flex min-h-(--control-xs) w-full items-center gap-2 rounded-md px-(--row-pad) text-start text-sidebar-mute pointer-coarse:min-h-11 hover:bg-sidebar-selected/70 hover:text-sidebar-selected-ink",
  GROUP_LABEL,
  FOCUS_RING_INSET,
)

function Sidebar({ collapsed = false, onCollapsedChange, open = false, onOpenChange, header, footer, search = false, animated, className, children, ...props }: SidebarProps) {
  const words = useWords()
  const narrow = useMedia(NARROW)
  const rail = collapsed && !narrow
  const [typed, setTyped] = React.useState("")
  const query = rail ? "" : typed.trim().toLowerCase()
  const nav = React.useRef<HTMLElement>(null)
  // Nothing left to show: read from the page after the rows have hidden themselves, so it holds for any row, however
  // deep the app nests it.
  const [none, setNone] = React.useState(false)
  React.useLayoutEffect(() => {
    setNone(query !== "" && nav.current !== null && nav.current.querySelector('[data-slot="nav-item-row"]:not([hidden])') === null)
  }, [query, children])
  const context = React.useMemo(() => ({ rail, query, animated }), [rail, query, animated])
  const rows = React.useMemo(() => ({ rail, query }), [rail, query])
  const toggle = onCollapsedChange && !narrow ? (
    <button type="button" data-slot="sidebar-collapse" aria-label={rail ? words.sidebar.expand : words.sidebar.collapse} aria-expanded={!rail} onClick={() => onCollapsedChange(!collapsed)} className={cn(CONTROL, "text-xs font-medium tracking-normal normal-case", rail && "justify-center px-0")}>
      {rail ? <PanelLeftOpen aria-hidden="true" className="size-4 shrink-0" /> : <PanelLeftClose aria-hidden="true" className="size-4 shrink-0" />}
      {rail ? null : <span aria-hidden="true">{words.sidebar.collapse}</span>}
    </button>
  ) : null
  const body = (
    <div
      data-slot="sidebar"
      data-collapsed={rail || undefined}
      // design-check-ignore-next-line dimension-value: the rail is one row wide (the density's row) and the sidebar's own 8px of padding on each side
      className={cn("flex h-full shrink-0 flex-col gap-2 bg-sidebar-paper p-2 text-sm text-sidebar-ink", rail ? "w-[calc(var(--row-height)_+_1rem)]" : "w-64", narrow && "w-full", className)}
    >
      {header && !rail ? <div data-slot="sidebar-header" className="shrink-0">{header}</div> : null}
      {search && !rail ? <SearchField value={typed} onValueChange={setTyped} aria-label={words.sidebar.search} placeholder={words.sidebar.search} className="shrink-0" /> : null}
      <nav
        ref={nav}
        aria-label={props["aria-label"]}
        data-slot="sidebar-nav"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
        onClick={(e) => {
          // In the drawer, choosing a place closes it: the page behind is where the user is going.
          if (narrow && e.target instanceof Element && e.target.closest('[data-slot="nav-item"]')) onOpenChange?.(false)
        }}
      >
        <SidebarContext.Provider value={context}>
          <NavContext.Provider value={rows}>
            <ToneContext.Provider value="sidebar">{children}</ToneContext.Provider>
          </NavContext.Provider>
        </SidebarContext.Provider>
        {none ? (
          <p data-slot="sidebar-empty" role="status" className="px-(--row-pad) py-2 text-sidebar-mute">
            {words.sidebar.empty}
          </p>
        ) : null}
      </nav>
      {footer && !rail ? <div data-slot="sidebar-footer" className="shrink-0">{footer}</div> : null}
      {toggle && rail ? (
        <Tooltip label={words.sidebar.expand} side="right">
          {toggle}
        </Tooltip>
      ) : (
        toggle
      )}
    </div>
  )
  if (narrow) {
    return (
      <Sheet open={open} onOpenChange={(next) => onOpenChange?.(next)}>
        <SheetContent side="left" showCloseButton={false} animated={animated} className="gap-0 bg-sidebar-paper">
          <SheetTitle className="sr-only">{props["aria-label"]}</SheetTitle>
          {body}
        </SheetContent>
      </Sheet>
    )
  }
  return <aside className="h-full shrink-0">{body}</aside>
}

export type SidebarGroupProps = {
  /** The heading of the group («Favorites», «Projects»). Without it the rows stand alone, as the first group often does. */
  label?: string | undefined
  /** The icon of the heading (an `Icon`), R6: without one the slot stays, empty. */
  icon?: React.ReactNode
  /** The heading opens and closes the group. */
  collapsible?: boolean | undefined
  /** A group that opens and closes: open at first (the default) or closed. */
  defaultOpen?: boolean | undefined
  className?: string | undefined
  children?: React.ReactNode
}

/**
 * A group of rows of the sidebar. On the rail the heading is not shown and every group is open, so no icon is hidden;
 * while a search is on every group is open too, and one with no row left is hidden.
 */
function SidebarGroup({ label, icon, collapsible = false, defaultOpen = true, className, children }: SidebarGroupProps) {
  const { rail, query, animated } = React.useContext(SidebarContext)
  const motion = useMotion(animated)
  const [open, setOpen] = React.useState(defaultOpen)
  const shown = !collapsible || open || rail || query !== ""
  const list = React.useRef<HTMLUListElement>(null)
  const id = React.useId()
  const [none, setNone] = React.useState(false)
  React.useLayoutEffect(() => {
    setNone(query !== "" && list.current !== null && list.current.querySelector('[data-slot="nav-item-row"]:not([hidden])') === null)
  }, [query, children])
  const arrow = <ChevronRight aria-hidden="true" className="size-3.5" />
  const heading = (
    <>
      <span aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </>
  )
  return (
    <div data-slot="sidebar-group" hidden={none} className={cn("flex flex-col gap-0.5", className)}>
      {label === undefined || rail ? null : collapsible ? (
        <button type="button" data-slot="sidebar-group-heading" aria-expanded={shown} aria-controls={id} onClick={() => setOpen(!shown)} className={CONTROL}>
          {heading}
          {motion ? <motion.Turn open={shown}>{arrow}</motion.Turn> : <span aria-hidden="true" className={cn("inline-flex", shown && "rotate-90")}>{arrow}</span>}
        </button>
      ) : (
        <div data-slot="sidebar-group-heading" className={cn("flex min-h-(--control-xs) items-center gap-2 px-(--row-pad) text-sidebar-mute", GROUP_LABEL)}>
          {heading}
        </div>
      )}
      <ul ref={list} id={id} role="list" aria-label={label} hidden={!shown} className="flex flex-col gap-0.5">
        {children}
      </ul>
    </div>
  )
}

export { Sidebar, SidebarGroup }
