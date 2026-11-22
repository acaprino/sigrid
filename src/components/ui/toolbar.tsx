// The toolbar: one row of actions that is a single Tab stop. Base UI's `Toolbar` carries the behaviour (the arrows
// move among the items, Home and End reach the ends, a disabled item stays reachable); the form is the toolkit's
// `Button` recipe at the dense height, so an item is the same control as everywhere else.
// - `ToolbarButton` is an action. With no children it is an icon alone: its `label` is its accessible name and the
//   hint under the pointer (with the `shortcut` after it, as plain text: R5). With children it is an icon and a word.
//   `pressed` makes it a switch (a filter that is on, a panel that is open): the selection tint, never the accent fill.
//   One item of a toolbar may be `variant="default"`, the one solid action of the screen (R3); the rest stay quiet.
// - `ToolbarSearch` is a search box that takes no room until it is asked for: a magnifier that opens into the
//   toolkit's `SearchField` on a press (or when the app opens it from its own key), and closes again with Esc, or when
//   it is left empty. While it holds text it stays open, so what filters the page is always in sight.
// - `ToolbarSeparator`, `ToolbarGroup`, `ToolbarTitle` and `ToolbarSpacer` lay the row out. Inside a `TitleBar` the
//   root, the title and the spacers also carry the bar's drag attributes, so the empty parts of the bar move the window.
// Short of room the bar gives way in fixed steps, measured on the toolbar itself and not on the screen (a container
// query, as Imago's frame does: a window half-snapped is narrow on a wide screen). Under 448px a button with an icon
// and a word keeps the icon alone, and the search shown as a field is its magnifier; under 256px the title goes.
// What the user needs to act (the buttons) is never what gives way.
// Icons are the app's (an `Icon`, or any 16px drawing); the magnifier is functional chrome, as in `SearchField`.
import * as React from "react"
import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar"
import { Search } from "lucide-react"
import { cn } from "../../lib/utils"
import { buttonVariants } from "./button"
import { SearchField } from "./search-field"
import { Tooltip } from "./tooltip"
import { TitleBarDragContext } from "./title-bar"

export type ToolbarProps = {
  /** Name of the toolbar for screen readers («Message actions»). */
  "aria-label": string
  className?: string | undefined
  children?: React.ReactNode
}

function Toolbar({ className, children, ...props }: ToolbarProps) {
  const drag = React.useContext(TitleBarDragContext)
  return (
    <ToolbarPrimitive.Root data-slot="toolbar" {...drag} {...props} className={cn("@container/toolbar flex min-w-0 flex-1 items-center gap-1 self-stretch", className)}>
      {children}
    </ToolbarPrimitive.Root>
  )
}

export type ToolbarButtonProps = Omit<React.ComponentProps<"button">, "aria-label" | "aria-pressed"> & {
  /** The name of the action: the accessible name, and the hint of a button that shows an icon alone. */
  label: string
  /** The drawing, 16px (an `Icon`). */
  icon?: React.ReactNode
  /** The key that does the same («Ctrl K»): plain text in the hint. */
  shortcut?: string | undefined
  /** `ghost` (the default) for an action among others, `outline` for one that stands out, `default` for the one solid action (R3). */
  variant?: "ghost" | "outline" | "default" | undefined
  /** A switch: on or off. Absent: a plain action. */
  pressed?: boolean | undefined
  /** With an icon and a word: the word stays on a narrow bar too (by default it gives way under 448px). */
  keepWord?: boolean | undefined
  /** The hint fades in (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
}

// A switch that is on has the selection tint and its ink; a disabled item stays in the arrows' path, dimmed.
const ITEM = "aria-pressed:bg-selected aria-pressed:text-selected-ink data-disabled:pointer-events-none data-disabled:opacity-50"

/** Gone while the toolbar is under 448px wide. */
const NARROW_GONE = "@max-md/toolbar:hidden"

function ToolbarButton({ label, icon, shortcut, variant = "ghost", pressed, keepWord = false, animated, className, children, type = "button", ref, ...props }: ToolbarButtonProps) {
  const iconOnly = children === undefined || children === null || children === false
  const button = (
    <ToolbarPrimitive.Button
      data-slot="button"
      data-toolbar-item="button"
      data-variant={variant}
      aria-label={label}
      aria-pressed={pressed}
      type={type}
      {...props}
      ref={ref as React.Ref<HTMLButtonElement>}
      className={cn(buttonVariants({ variant, size: iconOnly ? "icon-sm" : "sm" }), ITEM, className)}
    >
      {icon}
      {iconOnly ? null : icon && !keepWord ? <span data-slot="toolbar-button-word" className={cn("flex min-w-0 flex-1 items-center gap-2", NARROW_GONE)}>{children}</span> : children}
    </ToolbarPrimitive.Button>
  )
  if (!iconOnly) return button
  return (
    <Tooltip label={label} shortcut={shortcut} animated={animated}>
      {button}
    </Tooltip>
  )
}

function ToolbarSeparator({ className }: { className?: string | undefined }) {
  return <ToolbarPrimitive.Separator data-slot="toolbar-separator" className={cn("mx-1 h-4 w-px shrink-0 bg-line", className)} />
}

export type ToolbarGroupProps = {
  /** Name of the group for screen readers («View»). */
  "aria-label": string
  className?: string | undefined
  children?: React.ReactNode
}

function ToolbarGroup({ className, children, ...props }: ToolbarGroupProps) {
  return (
    <ToolbarPrimitive.Group data-slot="toolbar-group" {...props} className={cn("flex shrink-0 items-center gap-0.5", className)}>
      {children}
    </ToolbarPrimitive.Group>
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
  className?: string | undefined
}

const FIELD_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"])

function ToolbarSearch({ label, value, onValueChange, open, defaultOpen = false, onOpenChange, closed = "icon", shortcut, placeholder, animated, className }: ToolbarSearchProps) {
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
  if (!shown && closed === "field") {
    return (
      <ToolbarButton
        ref={button}
        data-toolbar-item="search"
        label={label}
        variant="outline"
        aria-expanded={false}
        icon={<Search aria-hidden="true" className="text-ink-mute" />}
        className="justify-start font-normal text-ink-mute @max-md/toolbar:border-transparent @md/toolbar:w-48"
        onClick={() => {
          want.current = "input"
          set(true)
        }}
      >
        <span className="flex-1 truncate text-start">{placeholder ?? label}</span>
        {shortcut ? <span data-slot="toolbar-search-shortcut" className="text-2xs font-medium">{shortcut}</span> : null}
      </ToolbarButton>
    )
  }
  if (!shown) {
    return (
      <ToolbarButton
        ref={button}
        data-toolbar-item="search"
        label={label}
        shortcut={shortcut}
        animated={animated}
        aria-expanded={false}
        icon={<Search aria-hidden="true" />}
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
      className={cn("w-64 min-w-24 shrink [&_input]:h-(--control-sm)", className)}
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

export { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSearch, ToolbarSeparator, ToolbarSpacer, ToolbarTitle }
