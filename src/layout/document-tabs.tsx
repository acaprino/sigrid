// The strip of open documents: a row of tabs the person opens, closes and moves between, with a `+` for a new one, as
// in a browser or an editor (`DocumentTabs`; `DocumentTab` is one of them). It stands on the toolkit's `Tabs` (Ark UI:
// one Tab stop, the arrows, Home and End) and on the arrows of a row too long for its room (`TabsList
// overflow="buttons"`): after the row come, in this order and never moving (R14), the arrow forward (there, disabled,
// when nothing overflows), a 1px divider and the `+`, all written in the tabs' own direction, so the order holds both ways.
// A tab closes with its × (out of the Tab order), a middle press or Delete. The app removes it (`onClose`) and chooses
// the tab shown next; the focus goes to the tab beside it (the next one, or the one before for the last), or to the `+`
// when none is left. `value` may be `null`: no tab is chosen when there is none.
// Two looks. `pill`: the chosen tab has the tint of a selection, as `Tabs` draws it. `attached` (in `AppShell
// frame="sheet" top="unified"`, which `auto` follows): the chosen tab is cut from the sheet below. It is the paper, with
// the sheet's 1px line on its top and its sides, its top corners `--radius-lg`, its bottom corners curving out into the
// sheet's top line (two small drawn corners, no gradient), its title in ink and semibold, and a 2px bar of the accent
// inside its top (R1). The other tabs are quiet text on the window's ground, with the same room, so nothing moves when the
// choice does. The strip lies 1px over the sheet's top line and the chosen tab covers it: the tab opens into the sheet.
// Where the strip starts at the sheet's start edge (the frame says so, `flushStart`; and outside a frame) the first tab
// has no corner there: its side drops straight into the sheet's side. Where something stands before the strip (the
// button that opens the sidebar as a drawer) it curves into the sheet's top line as the others do.
// Under glass the chosen tab is the sheet's glass and its corners are not drawn (theme.css).
// A colour the person gave to a document is an 8px dot beside its title, never a fill (R10).
import * as React from "react"
import { COLORS, COLOR_NAMES } from "../colors"
import type { HueName } from "../hues"
import { Icon } from "../icons"
import { UnifiedShellContext } from "../internal/frame"
import { steadyLabel } from "../internal/steady-label"
import { cn } from "../lib/utils"
import { Button } from "../primitives/button"
import { Dot } from "../primitives/dot"
import { Tabs, TabsList, TabsTrigger } from "../primitives/tabs"
import { Tooltip } from "../primitives/tooltip"
import { useWords } from "../words"

type Look = "attached" | "pill"

/** What the strip shares with its tabs: its look, the chosen tab, and where the focus goes when one closes. */
type Strip = {
  readonly look: Look
  readonly value: string | null
  /** The strip starts at the sheet's start edge: the first tab draws no start corner. */
  readonly flush: boolean
  /** A tab is about to close: the strip notes the tab that takes the focus once it has gone. */
  readonly closing: (value: string, item: HTMLElement) => void
}

const StripContext = React.createContext<Strip | null>(null)

/** The value of a colour of the palette named by its tint (`amber`): the palette's names are the tints' names. */
const BY_NAME: Readonly<Record<string, string>> = Object.fromEntries(COLORS.map((color) => [COLOR_NAMES[color].toLowerCase(), color]))

const tabsOf = (root: HTMLElement | null) => Array.from(root?.querySelectorAll<HTMLElement>('[data-slot="document-tab"]') ?? [])
const triggerOf = (item: HTMLElement | undefined) => item?.querySelector<HTMLButtonElement>('[data-slot="tabs-trigger"]') ?? null
const enabled = (item: HTMLElement) => triggerOf(item)?.disabled === false

export type DocumentTabsProps = {
  /** The name of the strip for screen readers. Absent: the words' («Open tabs»). */
  "aria-label"?: string | undefined
  /** The chosen tab; `null` (or absent) when none is, as when the last one has closed. */
  value: string | null | undefined
  onValueChange: (value: string) => void
  /** The `+` after the strip, for a new tab. Absent: no `+` and no divider. */
  onAdd?: (() => void) | undefined
  /** The name of the `+`. Absent: the words' («New tab»). */
  addLabel?: string | undefined
  /** `auto` (the default): `attached` inside `AppShell frame="sheet" top="unified"`, `pill` elsewhere. */
  appearance?: "auto" | "attached" | "pill" | undefined
  /** The tint slides to the new tab (`pill`), the buttons go down a little when pressed (off by default). */
  animated?: boolean | undefined
  className?: string | undefined
  /** The tabs: `DocumentTab`s. */
  children?: React.ReactNode
}

/** A strip of open documents: the tabs, the arrow forward when they overflow, a divider and the `+`. */
function DocumentTabs({ "aria-label": label, value, onValueChange, onAdd, addLabel, appearance = "auto", animated, className, children }: DocumentTabsProps) {
  const words = useWords().documentTabs
  const unified = React.useContext(UnifiedShellContext)
  const look: Look = appearance === "auto" ? (unified?.attachedTabs ? "attached" : "pill") : appearance
  const flush = unified?.flushStart !== false
  const root = React.useRef<HTMLDivElement>(null)
  const add = React.useRef<HTMLButtonElement>(null)
  const pending = React.useRef<{ readonly closed: string; readonly next: string | null } | null>(null)
  const chosen = value ?? null

  const closing = React.useCallback((closed: string, item: HTMLElement) => {
    const items = tabsOf(root.current)
    const at = items.indexOf(item)
    const next = items.slice(at + 1).find(enabled) ?? items.slice(0, Math.max(at, 0)).reverse().find(enabled)
    const want = { closed, next: next?.getAttribute("data-value") ?? null }
    pending.current = want
    // An app that does not close the tab now (it asks first) leaves the focus where it is.
    setTimeout(() => {
      if (pending.current === want) pending.current = null
    }, 0)
  }, [])

  // Once the tab has gone: the focus to the tab beside it, else the chosen one, else the first, else the `+`.
  React.useLayoutEffect(() => {
    const want = pending.current
    if (!want) return
    const items = tabsOf(root.current)
    const of = (v: string | null) => items.find((item) => item.getAttribute("data-value") === v)
    if (of(want.closed)) return
    pending.current = null
    const target = triggerOf(of(want.next)) ?? triggerOf(items.find((item) => item.hasAttribute("data-selected"))) ?? triggerOf(items.find(enabled)) ?? add.current
    target?.focus()
  })

  const strip = React.useMemo<Strip>(() => ({ look, value: chosen, flush, closing }), [look, chosen, flush, closing])
  const addName = addLabel ?? words.newTab
  return (
    <div
      ref={root}
      data-slot="document-tabs"
      data-appearance={look}
      // Attached, the strip lies over the sheet's top line by 1px, above it: the chosen tab covers that line.
      className={cn("flex min-w-0", look === "attached" && "relative z-10 -mb-px", className)}
    >
      {/* The divider and the `+` are inside the tabs' root, so they follow the same direction of writing as the tabs
          and their arrow: the order tabs, arrow, divider, `+` holds whichever way the row is written. Attached, the tabs
          never slide a tint, whatever the page's `MotionProvider` says: the chosen tab is the sheet's paper and its bar. */}
      <Tabs value={chosen ?? ""} onValueChange={onValueChange} animated={look === "pill" ? animated : false} className="min-w-0 flex-row items-end gap-0">
        <StripContext.Provider value={strip}>
          {/* Attached, the tabs reach the row's foot: the 1px they lie lower stays inside the row, which would cut it.
              And the row keeps `--radius-lg` of room at its end: the last tab's end corner reaches `--radius-lg` less 1px
              past it, and inside that room it adds nothing to what the row scrolls, at every radius, so the arrow
              forward stays disabled while the tabs fit. The start needs the same room only where the first tab draws its
              start corner (the strip does not start at the sheet's start edge). */}
          <TabsList aria-label={label ?? words.tabs} overflow="buttons" className={look === "attached" ? cn("mb-0 pb-px pe-(--radius-lg)", !flush && "ps-(--radius-lg)") : undefined}>
            {children}
          </TabsList>
        </StripContext.Provider>
        {onAdd ? (
          <>
            <span aria-hidden="true" data-slot="document-tabs-divider" className="mx-1 h-4 w-px shrink-0 self-center bg-line" />
            <Tooltip label={addName} animated={animated}>
              <Button ref={add} data-slot="document-tabs-add" variant="ghost" size="icon-sm" aria-label={addName} animated={animated} className="self-center" onClick={onAdd}>
                <Icon name="plus" />
              </Button>
            </Tooltip>
          </>
        ) : null}
      </Tabs>
    </div>
  )
}

export type DocumentTabProps = {
  value: string
  /** An `Icon` before the title. */
  icon?: React.ReactNode
  /** A colour the person gave to the document, one of the palette's by its name (`amber`) or its value: an 8px dot (R10). */
  color?: HueName | (typeof COLORS)[number] | undefined
  /** `false`: no × and no closing by Delete or a middle press, even with `onClose` (a tab kept open). */
  closable?: boolean | undefined
  /** The person closes the tab: the app removes it and chooses the tab shown next. Absent: the tab cannot close. */
  onClose?: (() => void) | undefined
  /** The name of the ×. Absent: the words', from the title («Close Trip»). */
  closeLabel?: string | undefined
  disabled?: boolean | undefined
  className?: string | undefined
  /** The title. */
  children: React.ReactNode
}

/** The text of a title, for the name of its ×. */
function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textOf).join("")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children)
  return ""
}

// Drawn only where glass is drawn (the gate of theme.css): there the chosen tab is a thin layer, and a corner over it
// would be a second one, with a seam. With less transparency asked, or forced colours, the corners are drawn.
const NOT_UNDER_GLASS = "[@media(forced-colors:none)_and_(prefers-reduced-transparency:no-preference)]:[[data-material=glass]_&]:hidden"

/**
 * A bottom corner of the chosen tab, curving out from its side into the sheet's top line: a square `--radius-lg` wide
 * against the tab's inner edge, whose 1px line is the tab's side at its top and the sheet's line at its foot, the paper
 * between the curve and the tab. Drawn mirrored where the row of tabs is written from the right (its own direction,
 * `:dir()`, which may not be the page's).
 */
function Fillet({ side, flush }: { side: "start" | "end"; flush: boolean }) {
  const start = side === "start"
  return (
    <span
      aria-hidden="true"
      data-slot="document-tab-fillet"
      data-side={side}
      // The first tab of a strip flush with the sheet's start edge has no start corner: its side is the sheet's side.
      className={cn("pointer-events-none absolute bottom-0 size-(--radius-lg)", start ? "end-full" : "start-full", start && flush && "group-first/document-tab:hidden", NOT_UNDER_GLASS)}
    >
      <svg viewBox="0 0 16 16" preserveAspectRatio="none" className="block size-full [&:dir(rtl)]:-scale-x-100">
        {/* The line is 2px on the curve: the paper drawn after it covers its inner half. */}
        <path d={start ? "M16 0A16 16 0 0 1 0 16" : "M0 0A16 16 0 0 0 16 16"} fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke" className="stroke-line" />
        <path d={start ? "M16 0A16 16 0 0 1 0 16H16Z" : "M0 0A16 16 0 0 0 16 16H0Z"} className="fill-paper" />
      </svg>
    </span>
  )
}

/** One open document in a `DocumentTabs`: its title, an icon and a dot if given, and its × when it can close. */
function DocumentTab({ value, icon, color, closable, onClose, closeLabel, disabled, className, children }: DocumentTabProps) {
  const strip = React.useContext(StripContext)
  const words = useWords().documentTabs
  const item = React.useRef<HTMLSpanElement>(null)
  const attached = strip?.look === "attached"
  const selected = strip !== null && strip.value === value
  const canClose = closable !== false && onClose !== undefined
  const dot = color === undefined ? undefined : (BY_NAME[color] ?? color)
  const close = (byButton: boolean) => {
    if (!canClose || disabled) return
    const el = item.current
    // The focus moves on from the tab that had it, or after its × was pressed; a middle press elsewhere leaves it be.
    if (el && strip && (byButton || el.contains(document.activeElement))) strip.closing(value, el)
    onClose?.()
  }
  return (
    <span
      ref={item}
      data-slot="document-tab"
      data-value={value}
      {...(selected ? { "data-selected": "" } : {})}
      onAuxClick={(event) => {
        if (event.button !== 1 || !canClose) return
        event.preventDefault()
        close(false)
      }}
      className={cn(
        "group/document-tab relative inline-flex items-center",
        // Every tab has the room of the chosen one's line, so nothing moves when the choice does.
        attached && "-mb-px rounded-t-lg border-t border-s border-e border-transparent",
        attached && selected && "z-10 border-line bg-paper font-semibold text-ink",
        className
      )}
    >
      {attached && selected ? <span aria-hidden="true" data-slot="document-tab-accent" className="pointer-events-none absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary" /> : null}
      <TabsTrigger
        value={value}
        disabled={disabled}
        onKeyDown={(event) => {
          if (event.key !== "Delete" || event.altKey || event.shiftKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return
          if (!canClose) return
          event.preventDefault()
          close(true)
        }}
        // Attached, the chosen tab's surface is the item's: the tab itself takes no tint.
        className={cn("max-w-56", canClose && "pe-8 pointer-coarse:pe-12", attached && "data-[selected]:bg-transparent data-[selected]:text-ink")}
      >
        {dot ? <Dot color={dot} /> : null}
        {icon}
        <span className="min-w-0 truncate">{steadyLabel(children)}</span>
      </TabsTrigger>
      {canClose ? (
        <Button
          variant="ghost"
          size="icon-xs"
          tabIndex={-1}
          aria-label={closeLabel ?? words.close(textOf(children))}
          disabled={disabled}
          className="absolute end-1 top-1/2 -translate-y-1/2"
          onClick={() => close(true)}
        >
          <Icon name="close" className="size-3.5" />
        </Button>
      ) : null}
      {attached && selected ? (
        <>
          <Fillet side="start" flush={strip.flush} />
          <Fillet side="end" flush={strip.flush} />
        </>
      ) : null}
    </span>
  )
}

export { DocumentTab, DocumentTabs }
