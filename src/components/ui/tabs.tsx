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
import { cn } from "../../lib/utils"
import { FOCUS_RING, FOCUS_RING_INSET } from "../../lib/focus"
import { useMotion } from "../../internal/motion"

type Impl = NonNullable<ReturnType<typeof useMotion>>
const TabsContext = React.createContext<{ value: string; motion: Impl | null; id: string } | null>(null)

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
}

function Tabs<Value extends string>({ value, onValueChange, activation = "automatic", className, children, animated }: TabsProps<Value>) {
  const motion = useMotion(animated)
  const id = React.useId()
  const context = React.useMemo(() => ({ value, motion, id }), [value, motion, id])
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      value={value}
      onValueChange={(details) => {
        if (details.value !== value) onValueChange(details.value as Value)
      }}
      activationMode={activation}
      className={cn("flex flex-col gap-2", className)}
    >
      <TabsContext.Provider value={context}>{children}</TabsContext.Provider>
    </TabsPrimitive.Root>
  )
}

export type TabsListProps = {
  /** Name of the group of tabs for screen readers. */
  "aria-label": string
  className?: string | undefined
  children?: React.ReactNode
}

function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List data-slot="tabs-list" className={cn("relative isolate flex flex-row gap-1", className)} {...props}>
      {children}
    </TabsPrimitive.List>
  )
}

const TRIGGER = cn(
  "relative inline-flex h-(--control-md) min-w-(--control-md) items-center gap-2 rounded-md px-4 text-sm font-semibold text-ink-mute pointer-coarse:h-auto pointer-coarse:min-h-11 hover:text-ink",
  FOCUS_RING,
  "focus-visible:z-10 data-[selected]:bg-selected data-[selected]:text-selected-ink",
  "disabled:pointer-events-none disabled:opacity-50"
)

export type TabsTriggerProps = {
  value: string
  disabled?: boolean | undefined
  className?: string | undefined
  children?: React.ReactNode
}

function TabsTrigger({ value, disabled, className, children }: TabsTriggerProps) {
  const tabs = React.useContext(TabsContext)
  const motion = tabs?.motion ?? null
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      {...(disabled !== undefined ? { disabled } : {})}
      className={cn(TRIGGER, motion && "isolate data-[selected]:bg-transparent", className)}
    >
      {motion && tabs && tabs.value === value ? <motion.Highlight id={tabs.id} className="absolute inset-0 -z-10 rounded-[inherit] bg-selected" /> : null}
      {children}
    </TabsPrimitive.Trigger>
  )
}

export type TabsContentProps = {
  value: string
  className?: string | undefined
  children?: React.ReactNode
}

/** The panel of a tab: in the page only while its tab is chosen, and a Tab stop of its own, after the tabs. */
function TabsContent({ value, className, children }: TabsContentProps) {
  return (
    <TabsPrimitive.Content data-slot="tabs-content" value={value} className={cn("w-full", FOCUS_RING_INSET, className)}>
      {children}
    </TabsPrimitive.Content>
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
