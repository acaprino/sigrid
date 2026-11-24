// SmoothUI (MIT) popover 4.0.0 — adapted for @acaprino/sigrid (https://smoothui.dev/r/base-nova/popover.json)
// Park UI (MIT) popover 102769c — recipe translated to Tailwind for @acaprino/sigrid (https://github.com/chakra-ui/park-ui/blob/102769c/packages/preset/src/recipes/popover.ts)
// From Park's `popover` recipe comes the form: l3 corners, the lg elevation in place of a border, 16px of padding, 320px
// wide (Park's `xs`), the title 16px medium.
// From SmoothUI we keep the primitive (Base UI's `Popover`: Root, Trigger, Portal, Positioner, Popup), the structure of
// `PopoverContent` (Portal + Positioner + Popup) and the classes of the card. The parts stay as before
// (`Popover`, `PopoverTrigger` with `asChild`, `PopoverContent` with `align`/`side`/`sideOffset`, `PopoverAnchor`,
// `PopoverHeader`/`Title`/`Description`), not SmoothUI's `trigger`/`children` API, so whoever uses them does not change.
// Removed: the spring and the automatic animation: with `animated` true (off by default, never with prefers-reduced-motion)
// the card enters with a short fade. As before: non-modal, Esc or a click outside close it and focus returns to the
// button; the button carries `data-state="open"|"closed"`.
import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "../lib/utils"
import { useEntrance } from "../internal/motion"
import { useMergedRef } from "../lib/refs"
import { renderWithOpenState } from "../internal/overlay"
import { usePortalContainer } from "../internal/portal-container"

type PopoverState = { open: boolean; anchor: Element | null; setAnchor: (el: Element | null) => void }
const PopoverStateContext = React.createContext<PopoverState | null>(null)

type PopoverProps = Omit<PopoverPrimitive.Root.Props, "onOpenChange"> & {
  onOpenChange?: ((open: boolean, details?: PopoverPrimitive.Root.ChangeEventDetails) => void) | undefined
}

function Popover({ open: openProp, defaultOpen = false, onOpenChange, ...props }: PopoverProps) {
  const [inner, setInner] = React.useState(defaultOpen)
  const [anchor, setAnchor] = React.useState<Element | null>(null)
  const open = openProp ?? inner
  const handleOpenChange = (next: boolean, details: PopoverPrimitive.Root.ChangeEventDetails) => {
    if (openProp === undefined) setInner(next)
    onOpenChange?.(next, details)
  }
  const state = React.useMemo(() => ({ open, anchor, setAnchor }), [open, anchor])
  return (
    <PopoverStateContext.Provider value={state}>
      <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange} {...props} />
    </PopoverStateContext.Provider>
  )
}

type PopoverTriggerProps = PopoverPrimitive.Trigger.Props & { asChild?: boolean | undefined }

function PopoverTrigger({ asChild, children, ...props }: PopoverTriggerProps) {
  const state = React.useContext(PopoverStateContext)
  const child = asChild && React.isValidElement(children) ? (children as React.ReactElement<Record<string, unknown>>) : null
  const nativeButton = child ? (typeof child.type === "string" ? child.type === "button" : true) : undefined
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      data-state={state?.open ? "open" : "closed"}
      {...props}
      {...(child ? { render: child, nativeButton } : {})}
    >
      {child ? undefined : children}
    </PopoverPrimitive.Trigger>
  )
}

type PopoverContentProps = PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding"> & {
    /** The card enters with a short fade (off by default, never with prefers-reduced-motion). */
    animated?: boolean | undefined
  }

function PopoverContent({
  className,
  align = "center",
  alignOffset,
  side = "bottom",
  sideOffset = 4,
  collisionPadding,
  animated,
  ref,
  ...props
}: PopoverContentProps) {
  const container = usePortalContainer()
  const state = React.useContext(PopoverStateContext)
  const enter = useEntrance<HTMLDivElement>(animated, (motion, el) => motion.enterPopup(el))
  const refs = useMergedRef(enter, ref)
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Positioner
        data-slot="popover-positioner"
        className="z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        {...(state?.anchor ? { anchor: state.anchor } : {})}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          render={renderWithOpenState}
          ref={refs}
          className={cn(
            "w-80 origin-(--transform-origin) rounded-lg bg-popover p-4 text-sm text-popover-foreground shadow-lg outline-hidden",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

/** A reference other than the button for the card's position (Base UI has no such part: the Positioner's `anchor`). */
function PopoverAnchor({ ref, ...props }: React.ComponentProps<"div">) {
  const setAnchor = React.useContext(PopoverStateContext)?.setAnchor
  const refs = useMergedRef(setAnchor, ref)
  return <div data-slot="popover-anchor" ref={refs} {...props} />
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-header" className={cn("flex flex-col gap-1 text-sm", className)} {...props} />
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-title" className={cn("text-base font-medium", className)} {...props} />
}

function PopoverDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="popover-description" className={cn("text-muted-foreground", className)} {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverHeader, PopoverTitle, PopoverDescription }
