// Park UI (MIT) segment-group 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/segment-group.ts)
// From Park's `segment-group` recipe comes the form (its md size): a quiet gray group with l3 corners and a hairline
// ring inside its edge, no padding, items 40px tall with 14px medium text and 14px of side padding, and the chosen item
// as a raised sheet with l3 corners (Park's indicator, here with its xs elevation, as in the approved preview).
// With `animated` the background of the pressed item is one pill that slides from the old choice to the new one
// (`Highlight` in `motion-impl`, `MOTION.slide`). The group only chooses: it shows no panels.
// Behaviour: Ark UI's ToggleGroup (`@ark-ui/react/toggle-group`, with `multiple` so the root carries `role="group"`
// and items carry `aria-pressed`, kept single-choice here so the already pressed button never turns off, with a single
// tab stop and arrow navigation; written from the right, Left goes to the next item).
// The group is as wide as its items, wherever it is put (in a pile that stretches its parts, too); with `fill` it is as
// wide as its place and its items share it equally, as two halves of a switch on a phone, so neither grows when pressed.
import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "@ark-ui/react/toggle-group"
import { cn } from "../lib/utils"
import { FOCUS_RING } from "../lib/focus"
import { useMotion } from "../internal/motion"
import { steadyLabel } from "../internal/steady-label"

type Impl = NonNullable<ReturnType<typeof useMotion>>
/** For the items: the pressed value and, with animations on, the Motion chunk and the id of this group's pill. */
const GroupContext = React.createContext<{ value: string; motion: Impl | null; id: string; fill: boolean } | null>(null)

export type ToggleGroupProps<Value extends string> = {
  /** The pressed value. */
  value: Value
  onValueChange: (value: Value) => void
  /** Name of the group for screen readers. */
  "aria-label": string
  className?: string | undefined
  children?: React.ReactNode
  /** The background of the pressed item slides to the new choice (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
  /** As wide as its place, the items sharing it equally (a switch across a phone). Absent: as wide as its items. */
  fill?: boolean | undefined
}

/** Single-choice group: a single tab stop, arrows to move, Space/Enter to choose. */
function ToggleGroup<Value extends string>({ value, onValueChange, className, children, animated, fill = false, ...props }: ToggleGroupProps<Value>) {
  const motion = useMotion(animated)
  const id = React.useId()
  const group = React.useMemo(() => ({ value, motion, id, fill }), [value, motion, id, fill])
  // shortcut: Ark's ToggleGroup (zag's toggle-group 1.45.0) reads its arrows as from the left whatever its `dir`, so
  // where it is written from the right Left and Right are sent again from the item, swapped. Upgrade: when Ark reads them
  // in its `dir`, test/direction.test.tsx sees them turned twice; then this goes.
  const swapping = React.useRef(false)
  const mirrored = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (swapping.current || event.currentTarget.dir !== "rtl" || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return
    event.preventDefault()
    event.stopPropagation()
    const { shiftKey, ctrlKey, altKey, metaKey } = event
    swapping.current = true
    try {
      event.target.dispatchEvent(new KeyboardEvent("keydown", { key: event.key === "ArrowLeft" ? "ArrowRight" : "ArrowLeft", shiftKey, ctrlKey, altKey, metaKey, bubbles: true, cancelable: true }))
    } finally {
      swapping.current = false
    }
  }
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      multiple
      onKeyDownCapture={mirrored}
      value={[value]}
      onValueChange={(details) => {
        // A click on the already pressed item would turn it off: in a single-choice group that one stays.
        const chosen = details.value.find((v) => v !== value)
        if (chosen !== undefined) onValueChange(chosen as Value)
      }}
      className={cn("inline-flex items-center rounded-lg bg-paper-2 inset-ring inset-ring-line", TRACK_BOLD, fill ? "w-full" : "w-fit", className)}
      {...props}
    >
      <GroupContext.Provider value={group}>{children}</GroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

// Under a theme with bold tabs (`ThemeDef.tabs: 'bold'`, `data-tabs="bold"` on the root; the owner, 2026-11-24), an
// exception to R7 scoped to that attribute. The group is a track: its hairline, 2px inside it and 2px between the
// items, which are 4px shorter so the track stays a control tall. The track has a control's corners (l2) and the
// items one step under them (l1); its ground is the ink at 3% over what it lies on, a field a little apart from the
// sheet (lighter in dark, darker in light), in place of the lanes' surface. The chosen
// item is weight 700 with the accent as text at 16% for its fill and at 55% for its border, and no shadow (R4: a
// border or a shadow). With `animated` the fill and the border are the sliding pill's, not the item's.
const TRACK_BOLD = "[[data-tabs=bold]_&]:gap-0.5 [[data-tabs=bold]_&]:rounded-md [[data-tabs=bold]_&]:bg-ink/3 [[data-tabs=bold]_&]:p-0.5"
const ITEM_BOLD =
  "[[data-tabs=bold]_&]:h-[calc(var(--control-md)_-_4px)] [[data-tabs=bold]_&]:min-w-[calc(var(--control-md)_-_4px)] [[data-tabs=bold]_&]:rounded-sm [[data-tabs=bold]_&]:border [[data-tabs=bold]_&]:border-transparent [[data-tabs=bold]_&]:data-[state=on]:font-bold [[data-tabs=bold]_&]:data-[state=on]:shadow-none"
const ITEM_BOLD_PRESSED =
  "[[data-tabs=bold]_&]:data-[state=on]:border-accent/55 [[data-tabs=bold]_&]:data-[state=on]:bg-accent/16 [[data-tabs=bold]_&]:data-[state=on]:hover:bg-accent/16"
const PILL_BOLD = "[[data-tabs=bold]_&]:-inset-px [[data-tabs=bold]_&]:border [[data-tabs=bold]_&]:border-accent/55 [[data-tabs=bold]_&]:bg-accent/16 [[data-tabs=bold]_&]:shadow-none"

const ITEM = cn(
  // Park's segment item, md: 40px, 14px medium text; the chosen one is a raised sheet with the xs elevation.
  "inline-flex h-(--control-md) min-w-(--control-md) items-center justify-center gap-2 rounded-lg px-(--pad-md) text-sm font-medium text-ink-mute pointer-coarse:h-auto pointer-coarse:min-h-11 hover:text-ink data-[state=on]:hover:bg-raised",
  FOCUS_RING,
  "data-[state=on]:bg-raised data-[state=on]:font-semibold data-[state=on]:text-ink data-[state=on]:shadow-xs",
  "disabled:pointer-events-none disabled:opacity-50"
)

export type ToggleGroupItemProps = {
  value: string
  children?: React.ReactNode
  className?: string | undefined
  disabled?: boolean | undefined
  /** With animations on: the classes of the sliding pill (background, corners), in place of the pressed item's own background. */
  highlightClassName?: string | undefined
}

function ToggleGroupItem({ className, children, highlightClassName, ...props }: ToggleGroupItemProps) {
  const group = React.useContext(GroupContext)
  const motion = group?.motion ?? null
  // In a group that fills its place, the items share it: equal halves, with the side padding of a narrow item.
  if (group?.fill) className = cn("flex-1 px-2", className)
  if (motion && group) {
    // The pill is a layer under the text of the pressed item; the item itself stays without a background.
    return (
      <ToggleGroupPrimitive.Item data-slot="toggle-group-item" className={cn(ITEM, ITEM_BOLD, className, "relative isolate data-[state=on]:bg-transparent data-[state=on]:shadow-none data-[state=on]:hover:bg-transparent")} {...props}>
        {group.value === props.value ? <motion.Highlight id={group.id} className={cn("absolute inset-0 -z-10 rounded-[inherit] bg-raised shadow-xs", PILL_BOLD, highlightClassName)} /> : null}
        {steadyLabel(children)}
      </ToggleGroupPrimitive.Item>
    )
  }
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(ITEM, ITEM_BOLD, ITEM_BOLD_PRESSED, className)}
      {...props}
    >
      {/* As wide pressed as not: a two-state switch stays where it is in both states. */}
      {steadyLabel(children)}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
