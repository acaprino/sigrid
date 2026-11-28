// Park UI (MIT) tabs 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tabs.ts)
// From Park's `tabs` recipe comes the form (its md size, its subtle variant): a row of triggers 40px tall with 14px
// semibold text, 16px of side padding and a 4px gap between them, the chosen one on a tinted sheet with l2 corners,
// and the panels below, 8px away. The tint is the theme's selection (`selected`, with `selected-ink`), the one tint a
// view has for what is chosen (R1); the others are muted text that turns to ink under the pointer. Park's `line`
// variant (a 2px bar under the chosen tab) is not offered: R1 keeps bars off the toolkit. For a choice with no panels
// use `ToggleGroup` (Park's `enclosed` look).
// Behaviour: Ark UI's Tabs (`role="tablist"`, one Tab stop, arrows move and, by default, choose; Home and End). With
// `animated` the tint is one sheet that slides from the old tab to the new one (`Highlight` in `motion-impl`).
// A row too long for its room scrolls sideways (`scroll`) and says there is more by fading its edges, or, with
// `overflow="buttons"` (a strip of open documents, for the mouse), by an arrow after it in a slot of its own: the arrow
// is there, disabled, when nothing overflows, so what follows the row never moves (R14).
import * as React from "react"
import { Tabs as TabsPrimitive } from "@ark-ui/react/tabs"
import { cn } from "../lib/utils"
import { FOCUS_RING, FOCUS_RING_INSET } from "../lib/focus"
import { useMotion } from "../internal/motion"
import { steadyLabel } from "../internal/steady-label"
import { Icon } from "../icons"
import { useWords } from "../words"
import { Button } from "./button"
import { Tooltip } from "./tooltip"

type Impl = NonNullable<ReturnType<typeof useMotion>>
const TabsContext = React.createContext<{ value: string; motion: Impl | null; id: string; from: "start" | "end" | null } | null>(null)

export type TabsProps<Value extends string> = {
  /** The chosen tab. */
  value: Value
  onValueChange: (value: Value) => void
  /** `automatic` (the default): the arrows choose as they move. `manual`: they only move, Enter or Space chooses. */
  activation?: "automatic" | "manual" | undefined
  className?: string | undefined
  children?: React.ReactNode
  /** The tint slides to the new tab (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
  /**
   * The ids of the tabs and of their panels by value, for an app that draws the panels itself and names them (`aria-labelledby`).
   * They go to Ark, which finds the tabs by them for the arrows: an `id` set on a tab afterwards would lose the arrows.
   */
  ids?: { trigger?: ((value: string) => string) | undefined; content?: ((value: string) => string) | undefined } | undefined
}

function Tabs<Value extends string>({ value, onValueChange, activation = "automatic", className, children, animated, ids }: TabsProps<Value>) {
  const motion = useMotion(animated)
  const id = React.useId()
  // A panel fades in when the person changes tab, never the one in the page at first.
  // It comes from the side of the tab pressed: from the end for a tab after the one before, from the start otherwise.
  const root = React.useRef<HTMLDivElement>(null)
  const before = React.useRef(value)
  const from = React.useRef<"start" | "end" | null>(null)
  if (before.current !== value) {
    const order = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]') ?? []).map((tab) => tab.getAttribute("data-value"))
    from.current = order.indexOf(value) >= order.indexOf(before.current) ? "end" : "start"
    before.current = value
  }
  const context = React.useMemo(() => ({ value, motion, id, from: from.current }), [value, motion, id, from.current])
  return (
    <TabsPrimitive.Root
      ref={root}
      data-slot="tabs"
      value={value}
      onValueChange={(details) => {
        if (details.value !== value) onValueChange(details.value as Value)
      }}
      activationMode={activation}
      {...(ids ? { ids } : {})}
      className={cn("flex flex-col gap-2", className)}
    >
      <TabsContext.Provider value={context}>{children}</TabsContext.Provider>
    </TabsPrimitive.Root>
  )
}

export type TabsListProps = {
  /** Name of the group of tabs for screen readers. */
  "aria-label": string
  /**
   * More tabs than fit in a row (the filters of a list, on a phone): the row scrolls sideways under the finger, its
   * edges fade where there is more, and the chosen tab is brought into sight. Absent: the row is as wide as its tabs.
   */
  scroll?: boolean | undefined
  /**
   * How a row that scrolls says there is more. `shade` (the default): with `scroll`, its edges fade where it goes on.
   * `buttons`: the row scrolls (with or without `scroll`) and an arrow after it steps forward by three quarters of the
   * row, toward the end of the line (to the left in a language written from the right). The arrow keeps its slot,
   * disabled, when there is no more: what comes after the row never moves (R14). Scrolled away from the start, an arrow
   * back appears before it. The arrows are for the pointer and out of the Tab order: the keys move through the tabs,
   * which come into sight.
   */
  overflow?: "shade" | "buttons" | undefined
  className?: string | undefined
  children?: React.ReactNode
}

/** The writing direction of the row itself (the one its scrolling follows), which may not be the page's. */
const isRtl = (el: HTMLElement) => getComputedStyle(el).direction === "rtl"

/**
 * The row's own room at its edges (its padding: the focus ring's room, a tab's corner), on the screen's left and right
 * and at its start and end, with its direction. No tab lies in that room: a row scrolled within it hides no tab.
 */
function roomOf(el: HTMLElement) {
  const style = getComputedStyle(el)
  const rtl = style.direction === "rtl"
  const left = parseFloat(style.paddingLeft) || 0
  const right = parseFloat(style.paddingRight) || 0
  return { rtl, left, right, start: rtl ? right : left, end: rtl ? left : right }
}

/**
 * Brings an item of a row that scrolls sideways into sight by scrolling the row alone (`scrollIntoView` would scroll
 * every box around it, the page too), with the row's room at its edges seen beside it: the least move, or to the
 * item's start where it is wider than what the row shows. Measured on the screen, where `scrollLeft` grows toward the
 * right whichever way the row is written (from 0 down to below 0 written from the right), and kept inside its limits.
 * The item is the outermost box around the tab inside the row (with its × and its borders): a wrapper with no box of
 * its own (`display: contents`, a `ContextMenu` around each tab) is passed over, and what has no box is not measured.
 */
function bringIntoSight(row: HTMLElement, target: HTMLElement) {
  if (target === row || !row.contains(target)) return
  let item = target
  for (let up = target.parentElement; up && up !== row; up = up.parentElement) {
    if (getComputedStyle(up).display !== "contents") item = up
  }
  const at = item.getBoundingClientRect()
  if (at.width === 0 && at.height === 0) return
  const room = roomOf(row)
  const box = row.getBoundingClientRect()
  const left = box.left + row.clientLeft + room.left
  const right = box.left + row.clientLeft + row.clientWidth - room.right
  const by =
    at.width > right - left ? (room.rtl ? at.right - right : at.left - left) : at.left < left ? at.left - left : at.right > right ? at.right - right : 0
  if (by === 0) return
  const range = Math.max(0, row.scrollWidth - row.clientWidth)
  const to = Math.min(room.rtl ? 0 : range, Math.max(room.rtl ? -range : 0, row.scrollLeft + by))
  if (to !== row.scrollLeft) row.scrollLeft = to
}

/**
 * Whether a row that scrolls sideways has more before its start and after its end, measured again as it changes, and
 * whether it is written from the right (its arrows point the way it scrolls). Its room at its edges counts as the edge:
 * scrolled within the room at its start there is nothing to go back to, and with only the room at its end left there
 * is nothing further.
 */
function useOverflow(list: React.RefObject<HTMLElement | null>, on: boolean) {
  const [edges, setEdges] = React.useState({ prev: false, next: false, rtl: false })
  const measure = React.useCallback(() => {
    const el = list.current
    if (!el) return
    const { rtl, start, end } = roomOf(el)
    // Written from the right, `scrollLeft` runs from 0 to below 0: the distance from the start is its size.
    const at = Math.abs(el.scrollLeft)
    const prev = at > start + 1
    const next = el.scrollWidth - el.clientWidth - at > end + 1
    setEdges((was) => (was.prev === prev && was.next === next && was.rtl === rtl ? was : { prev, next, rtl }))
  }, [list])
  // A tab added, closed or renamed by the app: measured after every drawing.
  React.useLayoutEffect(() => {
    if (on) measure()
  })
  React.useEffect(() => {
    const el = list.current
    if (!on || !el) return
    el.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    resize?.observe(el)
    // A tab that changes by itself (its title), without the row being drawn again.
    const changes = typeof MutationObserver === "undefined" ? null : new MutationObserver(measure)
    changes?.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      el.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
      resize?.disconnect()
      changes?.disconnect()
    }
  }, [on, measure, list])
  return edges
}

function TabsList({ className, children, scroll = false, overflow = "shade", ...props }: TabsListProps) {
  const tabs = React.useContext(TabsContext)
  const words = useWords().documentTabs
  const list = React.useRef<HTMLDivElement>(null)
  const value = tabs?.value
  const buttons = overflow === "buttons"
  const scrolls = scroll || buttons
  const edges = useOverflow(list, buttons)
  // The chosen tab is in sight, whichever way it was chosen (the arrows, the app): the row alone scrolls to it, never
  // the page around it, even for a row drawn below what is seen.
  React.useEffect(() => {
    const el = list.current
    if (!scrolls || !el) return
    const chosen = el.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-selected]')
    if (chosen) bringIntoSight(el, chosen)
  }, [scrolls, value])
  const row = (
    <TabsPrimitive.List
      ref={list}
      data-slot="tabs-list"
      {...(scroll && !buttons ? { "data-scroll-shade": "x" } : {})}
      // The room of a focus ring drawn outside a tab (2px, offset 2px): a scrolling row would cut it at its edges. With
      // the arrows the room at the end stays inside the row, so a tab never shows through the arrow after it.
      className={cn(
        "relative isolate flex flex-row gap-1",
        scroll && !buttons && "-m-1 max-w-full overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:none] *:shrink-0",
        buttons && "-my-1 -ms-1 max-w-full min-w-0 overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:none] *:shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  )
  if (!buttons) return row
  /**
   * One step: three quarters of the row, at least 120px, toward the end of its line or back toward its start, in the
   * row's own direction (the one `scrollLeft` follows).
   */
  const step = (forward: boolean) => {
    const el = list.current
    if (!el || typeof el.scrollBy !== "function") return
    const by = Math.max(120, Math.round(el.clientWidth * 0.75))
    el.scrollBy({ left: forward !== isRtl(el) ? by : -by })
  }
  // The arrows point the way the row scrolls: mirrored with the row, not with the page around it.
  const mirror = edges.rtl ? "-scale-x-100" : undefined
  // A press on an arrow leaves the focus where it was (the document being written, a tab): an arrow out of the Tab
  // order should not take it, and the arrow back leaves the page once the row is back at its start.
  const keepFocus = (event: React.MouseEvent) => event.preventDefault()
  return (
    <div data-slot="tabs-overflow" className="flex min-w-0 items-stretch">
      {row}
      {edges.prev ? (
        <Tooltip label={words.scrollPrev}>
          <Button
            data-slot="tabs-scroll-prev"
            variant="ghost"
            size="icon-xs"
            tabIndex={-1}
            aria-label={words.scrollPrev}
            className="self-center"
            onMouseDown={keepFocus}
            onClick={() => step(false)}
          >
            <Icon name="back" className={mirror} />
          </Button>
        </Tooltip>
      ) : null}
      <Tooltip label={words.scrollNext}>
        <Button
          data-slot="tabs-scroll-next"
          variant="ghost"
          size="icon-xs"
          tabIndex={-1}
          aria-label={words.scrollNext}
          disabled={!edges.next}
          className="self-center"
          onMouseDown={keepFocus}
          onClick={() => step(true)}
        >
          <Icon name="chevron" className={mirror} />
        </Button>
      </Tooltip>
    </div>
  )
}

const TRIGGER = cn(
  "relative inline-flex h-(--control-md) min-w-(--control-md) items-center gap-2 rounded-md px-4 text-sm font-medium text-ink-mute pointer-coarse:h-auto pointer-coarse:min-h-11 hover:text-ink",
  FOCUS_RING,
  "focus-visible:z-10 data-[selected]:bg-selected data-[selected]:font-semibold data-[selected]:text-selected-ink",
  "disabled:pointer-events-none disabled:opacity-50"
)

export type TabsTriggerProps = {
  value: string
  disabled?: boolean | undefined
  className?: string | undefined
  children?: React.ReactNode
  /**
   * After the tab, in the same item: a button that acts on it (closing it). It is not a tab: it keeps its own Tab stop, and
   * the arrows still move from tab to tab. With it the tab and the button sit in one `data-slot="tabs-item"` element.
   */
  end?: React.ReactNode
  /** The class of that item (only with `end`). */
  itemClassName?: string | undefined
} & Omit<React.ComponentPropsWithoutRef<"button">, "value" | "disabled" | "className" | "children" | "type" | "role" | "end">

function TabsTrigger({ value, disabled, className, children, end, itemClassName, ...rest }: TabsTriggerProps) {
  const tabs = React.useContext(TabsContext)
  const motion = tabs?.motion ?? null
  // `rest` is the caller's own attributes and handlers on the tab (an `onClick` hears a click on the chosen tab too, which is not a change of value).
  const trigger = (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      {...rest}
      {...(disabled !== undefined ? { disabled } : {})}
      className={cn(TRIGGER, motion && "isolate data-[selected]:bg-transparent", className)}
    >
      {motion && tabs && tabs.value === value ? <motion.Highlight id={tabs.id} className="absolute inset-0 -z-10 rounded-[inherit] bg-selected" /> : null}
      {/* As wide chosen as not: the tabs beside it never move. */}
      {steadyLabel(children)}
    </TabsPrimitive.Trigger>
  )
  if (end === undefined) return trigger
  return (
    <span data-slot="tabs-item" className={cn("relative inline-flex items-center", itemClassName)}>
      {trigger}
      {end}
    </span>
  )
}

export type TabsContentProps = {
  value: string
  className?: string | undefined
  children?: React.ReactNode
}

/** The panel of a tab: in the page only while its tab is chosen, and a Tab stop of its own, after the tabs. */
function TabsContent({ value, className, children }: TabsContentProps) {
  const from = React.useContext(TabsContext)?.from ?? null
  return (
    <TabsPrimitive.Content data-slot="tabs-content" value={value} {...(from ? { "data-reveal": "fade", "data-from": from } : {})} className={cn("w-full", FOCUS_RING_INSET, className)}>
      {children}
    </TabsPrimitive.Content>
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
