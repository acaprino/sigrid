// Park UI (MIT) tabs 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/tabs.ts)
// From Park's `tabs` recipe comes the form (its md size, its subtle variant): a row of triggers 40px tall with 14px
// semibold text, 16px of side padding and a 4px gap between them, the chosen one on a tinted sheet with l2 corners,
// and the panels below, 8px away. The tint is the theme's selection (`selected`, with `selected-ink`), the one tint a
// view has for what is chosen (R1); the others are muted text that turns to ink under the pointer. Park's `line`
// variant (a 2px bar under the chosen tab) is not offered: R1 keeps bars off the toolkit. For a choice with no panels
// use `ToggleGroup` (Park's `enclosed` look).
// Behaviour: Ark UI's Tabs (`role="tablist"`, one Tab stop, arrows move and, by default, choose; Home and End). With
// `animated` the tint is one sheet that slides from the old tab to the new one (`Highlight` in `motion-impl`).
import * as React from "react"
import { Tabs as TabsPrimitive } from "@ark-ui/react/tabs"
import { cn } from "../lib/utils"
import { FOCUS_RING, FOCUS_RING_INSET } from "../lib/focus"
import { useMotion } from "../internal/motion"
import { steadyLabel } from "../internal/steady-label"

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
  className?: string | undefined
  children?: React.ReactNode
}

function TabsList({ className, children, scroll = false, ...props }: TabsListProps) {
  const tabs = React.useContext(TabsContext)
  const list = React.useRef<HTMLDivElement>(null)
  const value = tabs?.value
  // The chosen tab is in sight, whichever way it was chosen (the arrows, the app).
  React.useEffect(() => {
    if (!scroll) return
    const chosen = list.current?.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-selected]')
    if (typeof chosen?.scrollIntoView === "function") chosen.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [scroll, value])
  return (
    <TabsPrimitive.List
      ref={list}
      data-slot="tabs-list"
      {...(scroll ? { "data-scroll-shade": "x" } : {})}
      // The room of a focus ring drawn outside a tab (2px, offset 2px): a scrolling row would cut it at its edges.
      className={cn("relative isolate flex flex-row gap-1", scroll && "-m-1 max-w-full overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:none] *:shrink-0", className)}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
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
