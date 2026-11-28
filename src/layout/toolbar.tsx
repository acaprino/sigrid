// The toolbar: one row of actions that is a single Tab stop. Native WAI-ARIA roving tabindex carries the behaviour
// (the arrows move among the items, Home and End reach the ends, a disabled item stays reachable); the form is the toolkit's
// `Button` recipe at the dense height, so an item is the same control as everywhere else.
// - `ToolbarButton` is an action. With no children it is an icon alone: its `label` is its accessible name and the
//   hint under the pointer (with the `shortcut` after it, as plain text: R5). With children it is an icon and a word.
//   `pressed` makes it a switch (a filter that is on, a panel that is open): the selection tint, never the accent fill.
//   One item of a toolbar may be `variant="default"`, the one solid action of the screen (R3); the rest stay quiet.
// - `ToolbarSearch` is a search box that takes no room until it is asked for: a magnifier that opens into the
//   toolkit's `SearchField` on a press (or when the app opens it from its own key), and closes again with Esc, or when
//   it is left empty. While it holds text it stays open, so what filters the page is always in sight.
// - `ToolbarBrand` is the app at the start of the bar, as in Imago's apps: a small square in the accent holding the
//   initial of the product's name, and the name beside it, or the name alone (`mark={false}`). With `page` the place
//   follows the name after a chevron («Daodan › Settings»). No drawn logo: the hue and the name tell the apps apart.
// - `ToolbarTabs` are the views of the app as words in the bar, after the brand, as in Xiox («Cleanup · Registry ·
//   Developers · Settings»): the view the user is in has the stronger text and a short bar in the accent under it. The
//   same tabs can sit in a toolbar of their own directly under the title bar (`AppShell`'s `tabs`), in a bar at the
//   foot of the window (`bottomBar`, with `edge="top"` and, on a narrow window, `layout="stacked"`: the icon over the
//   word), or small in the status bar (`size="sm"` in the `footer`).
// - A button with a word shows its `shortcut` after the word, as plain text («Commands Ctrl K»): the way into the
//   command palette.
// - `ToolbarSeparator`, `ToolbarGroup`, `ToolbarTitle` and `ToolbarSpacer` lay the row out. Inside a `TitleBar` the
//   root, the title and the spacers also carry the bar's drag attributes, so the empty parts of the bar move the window.
// Short of room the bar gives way in fixed steps, measured on the toolbar itself and not on the screen (a container
// query, as Imago's frame does: a window half-snapped is narrow on a wide screen). Under 448px a button with an icon
// and a word keeps the icon alone, and the search shown as a field is its magnifier; under 256px the title goes.
// What the user needs to act (the buttons) is never what gives way.
// The tools keep their places from one page or state to the next (the owner's rule, above all on a phone): a tool that
// a view lacks keeps its place, empty (`absent`), and a view's word is as wide chosen as not. What grows (a search that
// opens, the place in the brand) sits next to a `ToolbarSpacer`, so it takes the spacer's room and not a tool's place.
// Two sizes, chosen with a parameter: `md`, and `sm` for the dense bars of a classic desktop program (28px items, a
// 20px mark). A toolbar in a compact `TitleBar` is `sm` by itself. Text buttons that open a `DropdownMenu` («File»,
// «Edit», «View») make the menu bar of such a program out of the same parts.
// Icons are the app's (an `Icon`, or any 16px drawing); the magnifier is functional chrome, as in `SearchField`.
import * as React from "react"
import { ChevronRight } from "../internal/sigrid-icons"
import { Icon } from "../icons"
import { cn, isEmptyNode } from "../lib/utils"
import { KEY_CAP } from "../primitives/kbd"
import { FOCUS_RING_INSET } from "../lib/focus"
import { steadyLabel } from "../internal/steady-label"
import { buttonVariants } from "../primitives/button"
import { SearchField } from "../components/search-field"
import { Tooltip } from "../primitives/tooltip"
import { TitleBarDragContext, TitleBarSizeContext } from "./title-bar"

/** The size of the toolbar around: its buttons, its search and its brand read it. */
const ToolbarSizeContext = React.createContext<"md" | "sm">("md")

export type ToolbarProps = {
  /** Name of the toolbar for screen readers («Message actions»). */
  "aria-label": string
  /**
   * `md` (the default): 32px items at normal density. `sm`: 28px items, for the dense bars of a classic desktop
   * program. Absent: `sm` in a compact `TitleBar`, `md` elsewhere.
   */
  size?: "md" | "sm" | undefined
  className?: string | undefined
  children?: React.ReactNode
}

const NAV_SELECTOR = "[data-toolbar-nav]"

function navItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(NAV_SELECTOR)).filter(
    (item) => item.closest("[hidden], [inert]") === null,
  )
}

function Toolbar({ size, className, children, ...props }: ToolbarProps) {
  const drag = React.useContext(TitleBarDragContext)
  const bar = React.useContext(TitleBarSizeContext)
  const own = size ?? (bar === "compact" ? "sm" : "md")
  const root = React.useRef<HTMLDivElement>(null)

  // Keep a single Tab stop across the toolbar's visible items: active element first, then existing tabIndex 0, then first item.
  React.useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const items = navItems(el)
    if (items.length === 0) return
    const active = el.ownerDocument.activeElement
    const current = items.find((item) => item === active) ?? items.find((item) => item.tabIndex === 0) ?? items[0]
    for (const item of items) item.tabIndex = item === current ? 0 : -1
  })

  const onFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = (event.target as Element).closest?.(NAV_SELECTOR) as HTMLElement | null
    if (!target || !root.current?.contains(target)) return
    for (const item of navItems(root.current)) {
      item.tabIndex = item === target ? 0 : -1
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return
    const key = event.key
    if (key !== "ArrowRight" && key !== "ArrowLeft" && key !== "Home" && key !== "End") return
    const el = root.current
    if (!el) return
    const items = navItems(el)
    const current = items.indexOf(el.ownerDocument.activeElement as HTMLElement)
    if (current === -1 || items.length === 0) return
    const rtl = getComputedStyle(el).direction === "rtl"
    const forward = rtl ? "ArrowLeft" : "ArrowRight"
    let next: HTMLElement | undefined
    if (key === "Home") next = items[0]
    else if (key === "End") next = items[items.length - 1]
    else if (key === forward) next = items[(current + 1) % items.length]
    else next = items[(current - 1 + items.length) % items.length]
    if (!next) return
    event.preventDefault()
    for (const item of items) item.tabIndex = item === next ? 0 : -1
    next.focus()
  }

  return (
    <div
      ref={root}
      role="toolbar"
      aria-orientation="horizontal"
      data-slot="toolbar"
      data-size={own}
      onFocusCapture={onFocusCapture}
      onKeyDown={onKeyDown}
      {...drag}
      {...props}
      className={cn("@container/toolbar flex min-w-0 flex-1 items-center self-stretch", own === "sm" ? "gap-0.5" : "gap-1", className)}
    >
      <ToolbarSizeContext.Provider value={own}>{children}</ToolbarSizeContext.Provider>
    </div>
  )
}

export type ToolbarButtonProps = Omit<React.ComponentProps<"button">, "aria-label" | "aria-pressed"> & {
  /** The name of the action: the accessible name, and the hint of a button that shows an icon alone. */
  label: string
  /** The drawing, 16px (an `Icon`). */
  icon?: React.ReactNode
  /** The key that does the same («Ctrl K»): plain text in the hint. */
  shortcut?: string | undefined
  /**
   * `ghost` (the default) for an action among others, `outline` for one that stands out, `default` for the one solid
   * action (R3). `quiet` is an outline that does not ask to be pressed (the way to the commands, with its key): the
   * hairline of a divider and the muted ink, the ink under the pointer; it keeps the hairline under a theme with
   * strong control borders (`ThemeDef.controls`), where an `outline` takes the control border.
   */
  variant?: "ghost" | "outline" | "quiet" | "default" | undefined
  /** A switch: on or off. Absent: a plain action. */
  pressed?: boolean | undefined
  /** With an icon and a word: the word stays on a narrow bar too (by default it gives way under 448px). */
  keepWord?: boolean | undefined
  /** The hint fades in (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
  /**
   * The tool is not there in this view or this state: its place stays, empty and as wide as the tool, so the tools
   * beside it do not move (a control never changes place between pages or states). It is out of the page for the
   * keyboard and for screen readers.
   */
  absent?: boolean | undefined
}

// A switch that is on has the selection tint and its ink; a disabled item stays in the arrows' path, dimmed.
const ITEM = "aria-pressed:bg-selected aria-pressed:text-selected-ink data-disabled:pointer-events-none data-disabled:opacity-50"

/** Gone while the toolbar is under 448px wide. */
const NARROW_GONE = "@max-md/toolbar:hidden"

// The quiet button of a bar: the outline button with the muted ink, and its hairline kept where a theme's strong
// control borders would replace it (one attribute heavier than that rule, which sits in `:where()`).
const QUIET = "text-ink-mute hover:text-ink [[data-controls=strong]_&]:border-line"

function ToolbarButton({ label, icon, shortcut, variant = "ghost", pressed, keepWord = false, animated, absent = false, disabled, onClick, className, children, type = "button", ref, ...props }: ToolbarButtonProps) {
  const small = React.useContext(ToolbarSizeContext) === "sm"
  const iconOnly = isEmptyNode(children)
  // Beside a word the key is plain text in the button's own colour, a step quieter (R5).
  const key = shortcut && !iconOnly ? <span data-slot="toolbar-button-shortcut" className={cn("text-2xs font-medium opacity-70", KEY_CAP)}>{shortcut}</span> : null
  const look = cn(buttonVariants({ variant: variant === "quiet" ? "outline" : variant, size: iconOnly ? (small ? "icon-xs" : "icon-sm") : small ? "xs" : "sm" }), variant === "quiet" && QUIET, ITEM, className)
  const body = (
    <>
      {icon}
      {iconOnly ? null : icon && !keepWord ? (
        <span data-slot="toolbar-button-word" className={cn("flex min-w-0 flex-1 items-center gap-2", NARROW_GONE)}>
          {children}
          {key}
        </span>
      ) : (
        <>
          {children}
          {key}
        </>
      )}
    </>
  )
  // The same box with the same content, unseen: not an item of the toolbar, so the arrows pass it by.
  if (absent) {
    return (
      <span data-slot="toolbar-slot" aria-hidden="true" inert className={cn(look, "invisible")}>
        {body}
      </span>
    )
  }
  const button = (
    <button
      data-slot="button"
      data-toolbar-item="button"
      data-toolbar-nav=""
      data-variant={variant}
      data-disabled={disabled ? "" : undefined}
      aria-label={label}
      aria-pressed={pressed}
      aria-disabled={disabled ? true : undefined}
      tabIndex={-1}
      type={type}
      onClick={disabled ? (event) => event.preventDefault() : onClick}
      {...props}
      ref={ref}
      className={look}
    >
      {body}
    </button>
  )
  if (!iconOnly) return button
  return (
    <Tooltip label={label} shortcut={shortcut} animated={animated}>
      {button}
    </Tooltip>
  )
}

export type ToolbarTabsProps = {
  /** Name of the views for screen readers («Views»). */
  "aria-label": string
  /** The view the user is in. */
  value: string
  onValueChange: (value: string) => void
  /**
   * The edge of its bar the accent bar of the current view sits on: `bottom` (the default) for tabs in or under the
   * title bar, `top` for tabs in a bar at the foot of the window.
   */
  edge?: "bottom" | "top" | undefined
  /** `sm` for tabs in a status bar: 12px words. */
  size?: "md" | "sm" | undefined
  /** `stacked`: the icon over the word, each tab taking an equal share of the bar (a bottom bar on a narrow window). */
  layout?: "inline" | "stacked" | undefined
  className?: string | undefined
  children?: React.ReactNode
}

type TabsLook = { edge: "bottom" | "top"; size: "md" | "sm"; layout: "inline" | "stacked" }
const TabsContext = React.createContext<({ value: string; onValueChange: (value: string) => void } & TabsLook) | null>(null)

/** The views of the app, as words in a toolbar. They are places, not panels: the one the user is in is the current page. */
function ToolbarTabs({ value, onValueChange, edge = "bottom", size = "md", layout = "inline", className, children, ...props }: ToolbarTabsProps) {
  const context = React.useMemo(() => ({ value, onValueChange, edge, size, layout }), [value, onValueChange, edge, size, layout])
  return (
    <div role="group" data-slot="toolbar-tabs" data-edge={edge} {...props} className={cn("flex items-stretch self-stretch", layout === "stacked" ? "min-w-0 flex-1" : "shrink-0", className)}>
      <TabsContext.Provider value={context}>{children}</TabsContext.Provider>
    </div>
  )
}

export type ToolbarTabProps = {
  value: string
  /** A 16px drawing before the word. */
  icon?: React.ReactNode
  disabled?: boolean | undefined
  className?: string | undefined
  children?: React.ReactNode
}

// As tall as the bar, so the short accent bar of the current view sits on the bar's edge. The others get a quiet wash
// under the pointer, as the buttons beside them do; the current one has its bar and takes no wash.
const TAB = cn(
  "relative flex cursor-default items-center whitespace-nowrap text-ink-soft hover:text-ink not-aria-[current=page]:hover:bg-ink/6 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  "after:absolute after:inset-x-3 after:h-0.5 after:rounded-full after:content-['']",
  "aria-[current=page]:font-semibold aria-[current=page]:text-ink aria-[current=page]:after:bg-primary",
  FOCUS_RING_INSET,
)

// Under a theme with bold tabs (`ThemeDef.tabs: 'bold'`, `data-tabs="bold"` on the root; the owner, 2026-11-24), an
// exception to R7 scoped to that attribute: the mark of the chosen view is its weight and its line, not a fill. The
// others are weight 500 in the muted ink and turn to the ink under the pointer, with no wash; the chosen one is 700
// in the ink; the line is square and grows from its middle (`scale`, eased in styles/theme.css only with motion on).
// Each class has the state of the class it takes the place of and one attribute more, so it wins over it.
const TAB_BOLD =
  "[[data-tabs=bold]_&]:not-aria-[current=page]:font-medium [[data-tabs=bold]_&]:not-aria-[current=page]:text-ink-mute [[data-tabs=bold]_&]:not-aria-[current=page]:hover:bg-transparent [[data-tabs=bold]_&]:not-aria-[current=page]:hover:text-ink [[data-tabs=bold]_&]:aria-[current=page]:font-bold [[data-tabs=bold]_&]:aria-[current=page]:text-ink [[data-tabs=bold]_&]:after:scale-x-0 [[data-tabs=bold]_&]:after:rounded-none [[data-tabs=bold]_&]:after:bg-primary [[data-tabs=bold]_&]:aria-[current=page]:after:scale-x-100"

const TAB_BOLD_CLEAR_BOTTOM = "[[data-tabs=bold]_&]:after:bottom-0.75"
const TAB_BOLD_CLEAR_TOP = "[[data-tabs=bold]_&]:after:top-0.75"

function ToolbarTab({ value, icon, disabled, className, children }: ToolbarTabProps) {
  const tabs = React.useContext(TabsContext)
  const current = tabs?.value === value
  const look = cn(
    tabs?.edge === "top" ? "after:top-0" : "after:bottom-0",
    // Under bold tabs the line stops 3px short of the edge it is near, so clear ground is always seen between it and
    // the hairline of what lies beyond that edge (the sheet under the bar, the page above a bar at the foot).
    tabs?.edge === "top" ? TAB_BOLD_CLEAR_TOP : TAB_BOLD_CLEAR_BOTTOM,
    // Stacked, under 500px of height (a phone lying down) the word goes beside the icon: the bar stays 44px.
    tabs?.layout === "stacked" ? "min-w-0 flex-1 flex-col justify-center gap-0.5 px-2 py-1.5 text-2xs short:flex-row short:gap-1.5 short:py-0" : cn("shrink-0 gap-2 px-3", tabs?.size === "sm" ? "text-2xs" : "text-sm"),
  )
  return (
    <button
      data-slot="toolbar-tab"
      data-toolbar-nav=""
      data-disabled={disabled ? "" : undefined}
      tabIndex={-1}
      type="button"
      aria-disabled={disabled ? true : undefined}
      aria-current={current ? "page" : undefined}
      onClick={disabled ? (event) => event.preventDefault() : () => tabs?.onValueChange(value)}
      className={cn(TAB, TAB_BOLD, look, className)}
    >
      {icon}
      {/* As wide when it is the current view as when it is not: the views beside it never move. */}
      {steadyLabel(children)}
    </button>
  )
}

function ToolbarSeparator({ className }: { className?: string | undefined }) {
  return <div role="separator" aria-orientation="vertical" data-slot="toolbar-separator" className={cn("mx-1 h-4 w-px shrink-0 bg-line", className)} />
}

export type ToolbarGroupProps = {
  /** Name of the group for screen readers («View»). */
  "aria-label": string
  className?: string | undefined
  children?: React.ReactNode
}

function ToolbarGroup({ className, children, ...props }: ToolbarGroupProps) {
  return (
    <div role="group" data-slot="toolbar-group" {...props} className={cn("flex shrink-0 items-center gap-0.5", className)}>
      {children}
    </div>
  )
}

/** The first letter of a name, in capitals: what the mark shows. The same on every machine, whatever its language. */
export function brandInitial(name: string): string {
  const letter = Array.from(name.trim().normalize("NFC")).find((character) => /\p{L}/u.test(character))
  return letter ? (Array.from(letter.toUpperCase())[0] ?? "") : ""
}

export type ToolbarBrandProps = {
  /** The name of the product («Xiox»): shown beside the mark, and the source of its letter. */
  name: string
  /** In place of the letter, the app's own mark (a 16px drawing): the square stays. `false`: the name alone. */
  mark?: React.ReactNode | false
  /**
   * Where the user is, after the name: «Daodan › Settings». One name, or the path to it. On a toolbar under 448px
   * the app's name gives way and the place stays, after the mark.
   */
  page?: string | readonly string[] | undefined
  className?: string | undefined
}

/**
 * The app, at the start of the bar: the mark and the name. In a `TitleBar` both move the window. Under 256px of
 * toolbar the name goes and the mark stays.
 */
function ToolbarBrand({ name, mark, page, className }: ToolbarBrandProps) {
  const drag = React.useContext(TitleBarDragContext)
  const small = React.useContext(ToolbarSizeContext) === "sm"
  const letter = brandInitial(name)
  const path = page === undefined ? [] : typeof page === "string" ? [page] : page
  return (
    <span data-slot="toolbar-brand" {...drag} className={cn("flex min-w-0 items-center gap-2 px-1", className)}>
      {mark !== false && (mark || letter) ? (
        <span data-slot="toolbar-brand-mark" aria-hidden="true" {...drag} className={cn("flex shrink-0 items-center justify-center bg-primary font-semibold text-primary-foreground", small ? "size-5 rounded-sm text-2xs [&_svg]:size-3.5" : "size-6 rounded-md text-xs [&_svg]:size-4")}>
          {mark ?? letter}
        </span>
      ) : null}
      <span data-slot="toolbar-brand-name" {...drag} className={cn("truncate text-sm font-semibold text-ink", path.length > 0 ? NARROW_GONE : "@max-3xs/toolbar:hidden")}>
        {name}
      </span>
      {path.map((place, i) => (
        <React.Fragment key={`${i}-${place}`}>
          <ChevronRight aria-hidden="true" {...drag} className={cn("size-3.5 shrink-0 text-ink-mute", i === 0 && NARROW_GONE)} />
          <span data-slot="toolbar-brand-page" aria-current={i === path.length - 1 ? "page" : undefined} {...drag} className={cn("truncate text-sm", i === path.length - 1 ? "font-medium text-ink" : "text-ink-mute")}>
            {place}
          </span>
        </React.Fragment>
      ))}
    </span>
  )
}

/** The name of the window or of the place, in the bar: short of room it is cut with an ellipsis, down to 80px. */
function ToolbarTitle({ className, children }: { className?: string | undefined; children?: React.ReactNode }) {
  const drag = React.useContext(TitleBarDragContext)
  return (
    <span data-slot="toolbar-title" {...drag} className={cn("min-w-20 truncate px-1 text-sm font-semibold text-ink @max-3xs/toolbar:hidden", className)}>
      {children}
    </span>
  )
}

/** Empty room that pushes what follows to the end of the bar; in a `TitleBar` it moves the window. */
function ToolbarSpacer({ className }: { className?: string | undefined }) {
  const drag = React.useContext(TitleBarDragContext)
  return <span data-slot="toolbar-spacer" aria-hidden="true" {...drag} className={cn("min-w-2 flex-1 self-stretch", className)} />
}

export type ToolbarSearchProps = {
  /** The name of the search («Search the mail»): of the magnifier, of the field, and its placeholder. */
  label: string
  /** The text searched for. */
  value: string
  onValueChange: (value: string) => void
  /** Open, when the app decides (its own key opens it). Absent: the toolbar keeps the state. */
  open?: boolean | undefined
  defaultOpen?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  /**
   * Closed, it is the magnifier alone (`icon`, the default) or a quiet field with its name and its key (`field`), for
   * a bar where the search is the main way in. On a narrow bar the field is the magnifier too.
   */
  closed?: "icon" | "field" | undefined
  /** The key the app opens it with («Ctrl K»), shown in the hint. The app binds the key. */
  shortcut?: string | undefined
  /** The placeholder, if it differs from the name. */
  placeholder?: string | undefined
  animated?: boolean | undefined
  /** The search is not there in this view: its place stays, empty and as wide as it is closed, so the tools beside it do not move. */
  absent?: boolean | undefined
  className?: string | undefined
}

const FIELD_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"])

function ToolbarSearch({ label, value, onValueChange, open, defaultOpen = false, onOpenChange, closed = "icon", shortcut, placeholder, animated, absent = false, className }: ToolbarSearchProps) {
  const small = React.useContext(ToolbarSizeContext) === "sm"
  const [own, setOwn] = React.useState(defaultOpen)
  const asked = open ?? own
  const shown = asked || value !== ""
  const input = React.useRef<HTMLInputElement | null>(null)
  const button = React.useRef<HTMLButtonElement | null>(null)
  const want = React.useRef<"input" | "button" | null>(null)
  const set = (next: boolean) => {
    if (open === undefined) setOwn(next)
    onOpenChange?.(next)
  }
  // Focus follows the box: into the field when it opens from the magnifier, back to the magnifier when Esc closes it.
  React.useEffect(() => {
    if (want.current === "input" && shown) input.current?.focus()
    if (want.current === "button" && !shown) button.current?.focus()
    want.current = null
  }, [shown])
  // Opened by the app (its key): the field takes the focus as well.
  const first = React.useRef(true)
  React.useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (open) input.current?.focus()
  }, [open])
  if ((absent || !shown) && closed === "field") {
    return (
      <ToolbarButton
        ref={button}
        data-toolbar-item="search"
        label={label}
        absent={absent}
        variant="outline"
        aria-expanded={false}
        icon={<Icon name="search" className="text-ink-mute" />}
        className="justify-start font-normal text-ink-mute @max-md/toolbar:border-transparent @max-md/toolbar:[[data-controls=strong]_&]:border-transparent @md/toolbar:w-48"
        onClick={() => {
          want.current = "input"
          set(true)
        }}
      >
        <span className="flex-1 truncate text-start">{placeholder ?? label}</span>
        {shortcut ? <span data-slot="toolbar-search-shortcut" className={cn("text-2xs font-medium", KEY_CAP)}>{shortcut}</span> : null}
      </ToolbarButton>
    )
  }
  if (absent || !shown) {
    return (
      <ToolbarButton
        ref={button}
        data-toolbar-item="search"
        label={label}
        absent={absent}
        shortcut={shortcut}
        animated={animated}
        aria-expanded={false}
        icon={<Icon name="search" />}
        onClick={() => {
          want.current = "input"
          set(true)
        }}
      />
    )
  }
  return (
    <div
      data-slot="toolbar-search"
      className={cn("w-64 min-w-24 shrink", small ? "[&_input]:h-(--control-xs)" : "[&_input]:h-(--control-sm)", className)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation()
          want.current = "button"
          if (value !== "") onValueChange("")
          set(false)
        } else if (FIELD_KEYS.has(event.key)) {
          // Inside the field the arrows move the caret, not the toolbar's focus.
          event.stopPropagation()
        }
      }}
      onBlur={(event) => {
        if (value === "" && !event.currentTarget.contains(event.relatedTarget)) set(false)
      }}
    >
      <SearchField ref={input} aria-label={label} placeholder={placeholder ?? label} value={value} onValueChange={onValueChange} />
    </div>
  )
}

export { Toolbar, ToolbarBrand, ToolbarButton, ToolbarGroup, ToolbarSearch, ToolbarSeparator, ToolbarSpacer, ToolbarTab, ToolbarTabs, ToolbarTitle }
